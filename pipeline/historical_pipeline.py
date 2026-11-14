"""FireSignal historical common-grid activity, streamed from FIRMS ZIP archives.

This is common-support aggregation, NOT validated cross-sensor calibration.
Usage: python pipeline/historical_pipeline.py --modis data/raw/MODIS.zip --viirs data/raw/VIIRS.zip --start 2013-01-01 --end 2025-12-31
"""
import argparse
from contextlib import closing
import json
import sqlite3
import tempfile
from pathlib import Path
from zipfile import ZipFile

import numpy as np
import pandas as pd
from pyproj import Transformer

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / 'data' / 'historical'
COLUMNS = ['latitude', 'longitude', 'acq_date']
GRID_METRES = 5000


def process_archive(conn, sensor, zip_path, start, end, chunk_size):
    if not zip_path.is_file():
        raise FileNotFoundError(zip_path)
    transformer = Transformer.from_crs('EPSG:4326', 'EPSG:6933', always_xy=True)
    stats = {'rows_read': 0, 'rows_in_range': 0, 'rows_invalid': 0, 'chunks': 0}
    with ZipFile(zip_path) as zf:
        csvs = [n for n in zf.namelist() if n.lower().endswith('.csv')]
        if len(csvs) != 1:
            raise ValueError(f'{zip_path.name}: expected exactly one CSV, found {len(csvs)}')
        with zf.open(csvs[0]) as fh:
            for chunk in pd.read_csv(fh, usecols=lambda c: c in COLUMNS, chunksize=chunk_size):
                if not set(COLUMNS).issubset(chunk.columns):
                    raise ValueError(f'{zip_path.name}: missing required columns')
                stats['chunks'] += 1
                stats['rows_read'] += len(chunk)
                dates = pd.to_datetime(chunk['acq_date'], errors='coerce')
                lat = pd.to_numeric(chunk['latitude'], errors='coerce')
                lon = pd.to_numeric(chunk['longitude'], errors='coerce')
                valid = (dates.notna() & dates.between(start, end) & lat.between(-90, 90)
                         & lon.between(-180, 180))
                stats['rows_invalid'] += int((dates.isna() | ~lat.between(-90, 90) | ~lon.between(-180, 180)).sum())
                if not valid.any():
                    continue
                stats['rows_in_range'] += int(valid.sum())
                x, y = transformer.transform(lon.loc[valid].to_numpy(), lat.loc[valid].to_numpy())
                finite = np.isfinite(x) & np.isfinite(y)
                if not finite.all():
                    raise ValueError('Projection returned non-finite coordinates')
                # Same floor-based EPSG:6933 grid as experiment_01_grid.py.
                cx = np.floor(x / GRID_METRES).astype(np.int64)
                cy = np.floor(y / GRID_METRES).astype(np.int64)
                ds = dates.loc[valid].dt.strftime('%Y-%m-%d').to_numpy()
                # Dedup inside chunk for faster disk inserts; DB dedups across chunks.
                rows = pd.DataFrame({'d': ds, 'x': cx, 'y': cy}).drop_duplicates()
                conn.executemany('INSERT OR IGNORE INTO cells(sensor, day, cell_x, cell_y) VALUES (?, ?, ?, ?)',
                                 ((sensor, r.d, int(r.x), int(r.y)) for r in rows.itertuples(index=False)))
                conn.commit()
                if stats['chunks'] % 10 == 0:
                    print(f'  {sensor}: {stats["rows_read"]:,} rows scanned; {stats["chunks"]} chunks', flush=True)
    return stats


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--modis', type=Path, required=True, help='Path to MODIS FIRMS ZIP')
    parser.add_argument('--viirs', type=Path, required=True, help='Path to VIIRS S-NPP FIRMS ZIP')
    parser.add_argument('--start', default='2013-01-01')
    parser.add_argument('--end', default='2025-12-31')
    parser.add_argument('--chunk-size', type=int, default=100_000)
    parser.add_argument('--output', type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()
    start, end = pd.Timestamp(args.start), pd.Timestamp(args.end)
    if start > end or args.chunk_size < 1:
        parser.error('Invalid date range or chunk size')
    args.output.mkdir(parents=True, exist_ok=True)
    print('FireSignal historical OGCD | EPSG:6933 | 5 km | NOT calibrated', flush=True)
    with tempfile.TemporaryDirectory(prefix='firesignal_') as temp:
        db = Path(temp) / 'cells.sqlite'
        with closing(sqlite3.connect(db)) as conn:
            conn.execute('CREATE TABLE cells(sensor TEXT NOT NULL, day TEXT NOT NULL, cell_x INTEGER NOT NULL, cell_y INTEGER NOT NULL, PRIMARY KEY(sensor,day,cell_x,cell_y)) WITHOUT ROWID')
            stats = {}
            for sensor, path in [('MODIS', args.modis), ('VIIRS', args.viirs)]:
                print(f'Processing {sensor}: {path}', flush=True)
                stats[sensor] = process_archive(conn, sensor, path, start, end, args.chunk_size)
                print(f'  {sensor}: {stats[sensor]}', flush=True)
            daily = pd.read_sql_query('SELECT sensor, day AS date, COUNT(*) AS occupied_grid_cells FROM cells GROUP BY sensor, day ORDER BY sensor, day', conn)
    if daily.empty:
        raise ValueError('No valid detections in selected period')
    daily['month'] = daily['date'].str[:7]
    monthly = daily.groupby(['sensor', 'month'], as_index=False)['occupied_grid_cells'].sum()
    counts = daily.groupby(['sensor', 'month']).size().rename('days_with_detections').reset_index()
    monthly = monthly.merge(counts, on=['sensor', 'month'])
    # No fabricated zeroes: absence of detections is not proof of observation coverage.
    daily.to_csv(args.output / 'historical_daily_5km.csv', index=False)
    monthly.to_csv(args.output / 'historical_monthly_5km.csv', index=False)
    months = pd.period_range(start, end, freq='M').astype(str).tolist()
    calendar = [{'month': m, 'modis': None, 'viirs': None} for m in months]
    lookup = {(r.sensor, r.month): int(r.occupied_grid_cells) for r in monthly.itertuples(index=False)}
    for row in calendar:
        for sensor in ('MODIS', 'VIIRS'):
            row[sensor.lower()] = lookup.get((sensor, row['month']))
    (args.output / 'historical_calendar_5km.json').write_text(json.dumps(calendar, indent=2), encoding='utf-8')
    metadata = {'metric': 'occupied_grid_cell_days', 'grid_km': 5, 'projection': 'EPSG:6933',
                'requested_start': args.start, 'requested_end': args.end, 'archive_paths': {'MODIS': str(args.modis), 'VIIRS': str(args.viirs)},
                'processing': stats, 'calibration_status': 'not_validated',
                'coverage_warning': 'Days/months without detections are unknown, not verified zero activity. Archive request boundaries and observation coverage must be independently checked.',
                'calendar_null_definition': 'No detections in available archive for month; not necessarily zero burning activity'}
    (args.output / 'historical_metadata.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')
    print(f'Complete: {len(daily)} observed sensor-days; {len(monthly)} observed sensor-months; {len(calendar)} calendar months', flush=True)
    print(f'Outputs: {args.output.resolve()}', flush=True)


if __name__ == '__main__':
    main()
