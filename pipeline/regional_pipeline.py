"""FireSignal regional FIRMS activity on the national EPSG:6933 5 km grid.

Method: assign each detection point to an ADM1 polygon, then count distinct
(sensor, day, ADM1, cell_x, cell_y) keys. This is detection activity, not fire
counts, burned area, or physical cross-sensor calibration.

Usage:
    python pipeline/regional_pipeline.py --sample 10000
    python pipeline/regional_pipeline.py --full
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import tempfile
from collections import defaultdict
from contextlib import closing
from pathlib import Path
from zipfile import ZipFile

import geopandas as gpd
import numpy as np
import pandas as pd
from pyproj import Transformer

ROOT = Path(__file__).resolve().parents[1]
BOUNDARIES = ROOT / 'data' / 'boundaries' / 'india_adm1.geojson'
ARCHIVES = {
    'MODIS': ROOT / 'data' / 'raw' / 'DL_FIRE_M-C61_847437.zip',
    'VIIRS': ROOT / 'data' / 'raw' / 'DL_FIRE_SV-C2_847444.zip',
}
GRID_METRES = 5000


def load_regions():
    regions = gpd.read_file(BOUNDARIES)[['shapeName', 'geometry']]
    if regions.crs is None or len(regions) != 36:
        raise ValueError('Expected 36 regions with a declared CRS')
    regions = regions.to_crs('EPSG:4326')
    if regions['shapeName'].isna().any() or regions['shapeName'].duplicated().any():
        raise ValueError('Region names missing or duplicated')
    if not regions.geometry.is_valid.all() or regions.geometry.is_empty.any():
        raise ValueError('Invalid or empty boundary geometry')
    return regions.reset_index(drop=True)


def chunks_from_zip(path, chunk_size, sample):
    with ZipFile(path) as zf:
        csvs = [name for name in zf.namelist() if name.lower().endswith('.csv')]
        if len(csvs) != 1:
            raise ValueError(f'Expected one CSV in {path}; got {csvs}')
        with zf.open(csvs[0]) as source:
            remaining = sample
            for chunk in pd.read_csv(source, usecols=['latitude', 'longitude', 'acq_date'], chunksize=chunk_size):
                if remaining is not None:
                    chunk = chunk.head(remaining)
                    remaining -= len(chunk)
                if len(chunk):
                    yield chunk
                if remaining == 0:
                    break


def process_sensor(conn, sensor, archive, regions, transformer, chunk_size, sample):
    stats = defaultdict(int)
    for chunk in chunks_from_zip(archive, chunk_size, sample):
        stats['chunks'] += 1
        stats['rows_read'] += len(chunk)
        lat = pd.to_numeric(chunk['latitude'], errors='coerce')
        lon = pd.to_numeric(chunk['longitude'], errors='coerce')
        dates = pd.to_datetime(chunk['acq_date'], errors='coerce')
        valid = (lat.between(-90, 90) & lon.between(-180, 180) & dates.notna())
        stats['invalid_records'] += int((~valid).sum())
        if not valid.any():
            continue
        # Give every input observation a unique ID before the spatial join.
        frame = pd.DataFrame({
            'latitude': lat.loc[valid].to_numpy(),
            'longitude': lon.loc[valid].to_numpy(),
            'date': dates.loc[valid].dt.strftime('%Y-%m-%d').to_numpy(),
        })
        frame.index.name = 'observation_id'
        pts = gpd.GeoDataFrame(frame, geometry=gpd.points_from_xy(frame.longitude, frame.latitude), crs='EPSG:4326')
        # 'intersects' includes points on polygon boundaries. Ties are assigned
        # deterministically to one region; these ties are reported separately.
        joined = gpd.sjoin(pts, regions, how='left', predicate='intersects')
        matches = joined['shapeName'].notna()
        counts = joined.loc[matches].groupby(level=0).size()
        stats['boundary_multi_matches'] += int((counts > 1).sum())
        stats['unmatched_records'] += int(len(frame) - len(counts))
        stats['matched_records'] += int(len(counts))
        joined = joined.loc[matches].sort_values(['shapeName'], kind='stable')
        joined = joined.loc[~joined.index.duplicated(keep='first')].copy()
        if joined.empty:
            continue
        x, y = transformer.transform(joined['longitude'].to_numpy(), joined['latitude'].to_numpy())
        finite = np.isfinite(x) & np.isfinite(y)
        if not finite.all():
            raise ValueError(f'Non-finite projected coordinates in {sensor}')
        cx = np.floor(np.asarray(x) / GRID_METRES).astype(np.int64)
        cy = np.floor(np.asarray(y) / GRID_METRES).astype(np.int64)
        rows = pd.DataFrame({
            'region': joined['shapeName'].to_numpy(),
            'day': joined['date'].to_numpy(),
            'x': cx,
            'y': cy,
        }).drop_duplicates()
        conn.executemany(
            'INSERT OR IGNORE INTO regional_cells(sensor, region, day, cell_x, cell_y) VALUES (?, ?, ?, ?, ?)',
            ((sensor, r.region, r.day, int(r.x), int(r.y)) for r in rows.itertuples(index=False)),
        )
        conn.commit()
        if stats['chunks'] % 10 == 0:
            print(f'  {sensor}: {stats["rows_read"]:,} observations read', flush=True)
    return dict(stats)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--sample', type=int, help='First N observations from each sensor (testing only)')
    mode.add_argument('--full', action='store_true', help='Process the entire archives')
    parser.add_argument('--chunk-size', type=int, default=100000)
    parser.add_argument('--output', type=Path, default=ROOT / 'data' / 'historical')
    args = parser.parse_args()
    if args.chunk_size < 1 or (args.sample is not None and args.sample < 1):
        parser.error('Sample and chunk size must be positive')
    regions = load_regions()
    print(f'Loaded {len(regions)} regions | EPSG:6933 | 5 km', flush=True)
    transformer = Transformer.from_crs('EPSG:4326', 'EPSG:6933', always_xy=True)
    stats = {}
    with tempfile.TemporaryDirectory(prefix='firesignal_regions_') as temp:
        with closing(sqlite3.connect(Path(temp) / 'regional.sqlite')) as conn:
            conn.execute('PRAGMA journal_mode = WAL')
            conn.execute('CREATE TABLE regional_cells (sensor TEXT, region TEXT, day TEXT, cell_x INTEGER, cell_y INTEGER, PRIMARY KEY(sensor, region, day, cell_x, cell_y)) WITHOUT ROWID')
            for sensor, path in ARCHIVES.items():
                if not path.is_file():
                    raise FileNotFoundError(path)
                print(f'Processing {sensor}: {path.name}', flush=True)
                stats[sensor] = process_sensor(conn, sensor, path, regions, transformer, args.chunk_size, args.sample)
                print(f'  {sensor} quality: {stats[sensor]}', flush=True)
            # Compare regional sum with distinct national keys among MATCHED points.
            # This is not the same as comparing with the national archive output,
            # which includes observations outside the ADM1 boundary dataset.
            reconciliation = pd.read_sql_query('''
                SELECT sensor,
                    COUNT(*) AS regional_ogcd,
                    COUNT(DISTINCT day || ':' || cell_x || ':' || cell_y) AS matched_national_ogcd
                FROM regional_cells GROUP BY sensor ORDER BY sensor
            ''', conn)
            monthly = pd.read_sql_query('''
                SELECT sensor, region AS shapeName, substr(day,1,7) AS month,
                       COUNT(*) AS occupied_grid_cell_days,
                       COUNT(DISTINCT day) AS days_with_detections
                FROM regional_cells
                GROUP BY sensor, region, substr(day,1,7)
                ORDER BY sensor, region, month
            ''', conn)
    if monthly.empty:
        raise ValueError('No regional observations matched')
    args.output.mkdir(parents=True, exist_ok=True)
    prefix = 'regional_sample' if args.sample is not None else 'regional'
    csv_path = args.output / f'{prefix}_monthly_5km.csv'
    report_path = args.output / f'{prefix}_quality_5km.json'
    monthly.to_csv(csv_path, index=False, encoding='utf-8')
    report = {
        'mode': 'sample' if args.sample is not None else 'full',
        'sample_rows_per_sensor': args.sample,
        'grid_projection': 'EPSG:6933',
        'grid_metres': GRID_METRES,
        'boundary_source': 'geoBoundaries gbOpen IND ADM1; underlying DataMeet India / Election Commission of India',
        'boundary_year_represented': 2011,
        'boundary_license': 'CC BY 2.5 IN',
        'metric': 'regional occupied grid-cell-days',
        'method': 'Point-in-polygon assignment; one deterministic region per detection; distinct region/date/5km-cell keys',
        'limitations': [
            'Not individual fires, burned area, or physical sensor calibration.',
            '2011 administrative boundary snapshot is not time-varying.',
            'Regional OGCD totals can exceed national OGCD due to cross-border cells.',
            'Unmatched detections are excluded from regional totals.',
            'Absence of detections does not establish satellite observation coverage.',
        ],
        'processing': stats,
        'reconciliation_matched_only': reconciliation.to_dict(orient='records'),
    }
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')
    print('\nReconciliation (matched observations only):', flush=True)
    print(reconciliation.to_string(index=False), flush=True)
    print(f'\nSaved {len(monthly):,} monthly rows: {csv_path}', flush=True)
    print(f'Saved quality report: {report_path}', flush=True)


if __name__ == '__main__':
    main()
