"""FireSignal H13: reproducible India-wide monthly MODIS/VIIRS comparison.

Usage:
  python pipeline/harmonization_experiment.py --input data/historical/historical_monthly_5km.csv --output frontend/public/data/harmonization_results.json

Fits only on 2013-2021, selects model on 2022-2023, reports 2024-2025 once.
Empirical statistical adjustment; NOT validated sensor calibration.
"""
from __future__ import annotations
import argparse
import csv
import json
import math
import statistics
from pathlib import Path

TRAIN = range(2013, 2022)
VALID = range(2022, 2024)
TEST = range(2024, 2026)

def read_pairs(path):
    by_month = {}
    with open(path, newline='', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        needed = {'sensor', 'month', 'occupied_grid_cells'}
        if not needed.issubset(reader.fieldnames or []):
            raise ValueError(f'Missing required columns: {needed - set(reader.fieldnames or [])}')
        for row in reader:
            sensor, month = row['sensor'].strip().upper(), row['month'].strip()
            if sensor not in ('MODIS', 'VIIRS'):
                continue
            if month in by_month and sensor in by_month[month]:
                raise ValueError(f'Duplicate sensor/month: {sensor}, {month}')
            value = int(row['occupied_grid_cells'])
            if value < 0:
                raise ValueError(f'Negative OGCD for {sensor}, {month}')
            by_month.setdefault(month, {})[sensor] = value
    pairs = []
    for month in sorted(by_month):
        year = int(month[:4]); mon = int(month[5:7])
        if year in range(2013, 2026) and 1 <= mon <= 12:
            sensors = by_month[month]
            if 'MODIS' not in sensors or 'VIIRS' not in sensors:
                raise ValueError(f'Missing overlapping sensor observation in {month}; cannot assume zero')
            pairs.append({'month': month, 'year': year, 'calendar_month': mon,
                          'modis': sensors['MODIS'], 'viirs': sensors['VIIRS']})
    if len(pairs) != 156:
        raise ValueError(f'Expected 156 paired months (2013-2025); got {len(pairs)}')
    return pairs

def metric(rows, pred):
    errors = [pred(r) - r['modis'] for r in rows]
    return {'n_months': len(rows), 'mae': round(sum(abs(e) for e in errors)/len(errors), 2),
            'rmse': round(math.sqrt(sum(e*e for e in errors)/len(errors)), 2),
            'bias': round(sum(errors)/len(errors), 2)}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--input', default='data/historical/historical_monthly_5km.csv')
    ap.add_argument('--output', default='frontend/public/data/harmonization_results.json')
    args = ap.parse_args()
    pairs = read_pairs(args.input)
    train = [r for r in pairs if r['year'] in TRAIN]
    valid = [r for r in pairs if r['year'] in VALID]
    test = [r for r in pairs if r['year'] in TEST]
    assert (len(train), len(valid), len(test)) == (108, 24, 24)

    # Global least-squares slope through origin: VIIRS OGCD -> MODIS OGCD.
    denom = sum(r['viirs']**2 for r in train)
    if denom == 0:
        raise ValueError('Training VIIRS counts are all zero')
    global_factor = sum(r['viirs'] * r['modis'] for r in train) / denom
    month_medians = {m: statistics.median(r['modis'] for r in train if r['calendar_month'] == m)
                     for m in range(1, 13)}
    # Season-specific least-squares slopes; shrink towards global slope to limit overfit.
    # Shrinkage strength is fixed before examining validation or test results.
    shrinkage = 6
    month_factors = {}
    for m in range(1, 13):
        sub = [r for r in train if r['calendar_month'] == m]
        d = sum(r['viirs']**2 for r in sub)
        local = sum(r['viirs']*r['modis'] for r in sub)/d if d else global_factor
        month_factors[m] = (len(sub)*local + shrinkage*global_factor)/(len(sub)+shrinkage)

    models = {
        'raw_viirs': lambda r: r['viirs'],
        'global_adjustment': lambda r: global_factor*r['viirs'],
        'seasonal_adjustment': lambda r: month_factors[r['calendar_month']]*r['viirs'],
        'modis_seasonal_median': lambda r: month_medians[r['calendar_month']],
    }
    validation = {name: metric(valid, pred) for name, pred in models.items()}
    # Choose only between VIIRS-based approaches. Seasonal median is a reference benchmark.
    candidates = ['raw_viirs', 'global_adjustment', 'seasonal_adjustment']
    chosen = min(candidates, key=lambda name: (validation[name]['mae'], validation[name]['rmse']))
    testing = {name: metric(test, pred) for name, pred in models.items()}
    output = {
        'title': 'India monthly 5 km OGCD cross-sensor evaluation',
        'status': 'empirical_statistical_adjustment_not_physical_calibration',
        'metric': 'occupied_grid_cell_days',
        'geography': 'India', 'grid_km': 5,
        'splits': {'train': '2013-2021', 'validation': '2022-2023', 'test': '2024-2025'},
        'method': {'global': 'least-squares VIIRS-to-MODIS slope through origin',
                   'seasonal': 'calendar-month slope shrunk towards global slope (9 training years, strength=6)',
                   'selection': 'lowest validation MAE among raw VIIRS, global, seasonal; RMSE tiebreaker',
                   'reference': 'training-period same-calendar-month MODIS median'},
        'global_factor': round(global_factor, 6),
        'seasonal_factors': {str(m): round(month_factors[m], 6) for m in range(1,13)},
        'validation_metrics': validation, 'selected_model': chosen,
        'test_metrics': testing,
        'test_months': [dict(month=r['month'], modis=r['modis'], viirs=r['viirs'],
                             selected_prediction=round(models[chosen](r), 2),
                             global_prediction=round(models['global_adjustment'](r), 2),
                             seasonal_prediction=round(models['seasonal_adjustment'](r), 2),
                             modis_seasonal_median=round(models['modis_seasonal_median'](r), 2)) for r in test],
        'limitations': [
            'No ground-truth fires or burned-area validation.',
            'Not normalized for satellite overpass opportunity, clouds, or coverage.',
            'Aggregated India-wide monthly data; not validated for local geography or daily inference.',
            'Monthly pairs are serially and seasonally dependent; metrics are descriptive.',
            'Test set is evaluated after selecting the model on validation years; do not tune based on test outcomes.',
        ],
    }
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(output, indent=2) + '\n', encoding='utf-8')
    print('FireSignal H13 | India monthly OGCD | NOT physically calibrated')
    print('Paired months: train=108, validation=24, test=24')
    print(f'Global VIIRS->MODIS factor: {global_factor:.6f}')
    print('VALIDATION (2022-2023):')
    for name, m in validation.items():
        print(f"  {name:23} MAE={m['mae']:10,.2f} RMSE={m['rmse']:10,.2f}")
    print(f'Selected on validation: {chosen}')
    print('FINAL HELD-OUT TEST (2024-2025):')
    for name, m in testing.items():
        print(f"  {name:23} MAE={m['mae']:10,.2f} RMSE={m['rmse']:10,.2f}")
    print(f'Output: {out}')

if __name__ == '__main__':
    main()
