'use client';

import { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  Upload,
  UserPlus,
} from 'lucide-react';

import { buttonVariants } from '@/components/ui/button-variants';

type CsvPreviewRow = {
  full_name: string;
  phone: string;
  bvn: string;
};

const TEMPLATE_CSV = 'full_name,phone,bvn\nKemi Adesina,08035551000,22334455667\n';

export const EnrollMembersSection = () => {
  const [mode, setMode] = useState<'manual' | 'csv'>('manual');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [rows, setRows] = useState<CsvPreviewRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadState, setUploadState] = useState<'idle' | 'done'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validRows = useMemo(
    () => rows.filter((row) => row.full_name && row.phone && row.bvn),
    [rows],
  );
  const invalidRows = rows.length - validRows.length;

  const onPickCsv = () => fileInputRef.current?.click();

  const onSelectCsv: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    setUploadState('idle');
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const [headerLine, ...dataLines] = text.split(/\r?\n/).filter(Boolean);
      const headers = headerLine.split(',').map((item) => item.trim().toLowerCase());
      const idxName = headers.indexOf('full_name');
      const idxPhone = headers.indexOf('phone');
      const idxBvn = headers.indexOf('bvn');
      const parsed = dataLines.map((line) => {
        const cols = line.split(',').map((item) => item.trim());
        return {
          full_name: cols[idxName] ?? '',
          phone: cols[idxPhone] ?? '',
          bvn: cols[idxBvn] ?? '',
        };
      });
      setRows(parsed);
    };
    reader.readAsText(file);
  };

  const onDummyUpload = async () => {
    setIsUploading(true);
    setUploadState('idle');
    await new Promise((resolve) => setTimeout(resolve, 900));
    setIsUploading(false);
    setUploadState('done');
  };

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={buttonVariants({
            variant: mode === 'manual' ? 'default' : 'outline',
            className: 'justify-center',
          })}
        >
          <UserPlus className="size-4" />
          Add Member Manually
        </button>
        <button
          type="button"
          onClick={() => setMode('csv')}
          className={buttonVariants({
            variant: mode === 'csv' ? 'default' : 'outline',
            className: 'justify-center',
          })}
        >
          <FileSpreadsheet className="size-4" />
          Upload CSV
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className={mode === 'manual' ? '' : 'hidden lg:block'}>
          <div className="rounded-xl border border-white/10 bg-black/10 p-4">
            <h3 className="text-sm font-semibold text-white">Manual member entry</h3>
            <p className="mt-1 text-xs text-slate-400">
              Quick add for walk-in onboarding at the market.
            </p>
            <div className="mt-3 grid gap-3">
              <label className="text-xs">
                <span className="mb-1 block text-slate-300">Full name</span>
                <input
                  placeholder="e.g. Kemi Adesina"
                  className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs">
                  <span className="mb-1 block text-slate-300">Phone number</span>
                  <input
                    placeholder="e.g. 0803 555 1000"
                    className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs">
                  <span className="mb-1 block text-slate-300">BVN</span>
                  <input
                    placeholder="11-digit BVN"
                    className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <button type="button" className={buttonVariants({ className: 'justify-center' })}>
                <CheckCircle2 className="size-4" />
                Save member
              </button>
            </div>
          </div>
        </div>

        <div className={mode === 'csv' ? '' : 'hidden lg:block'}>
          <div className="rounded-xl border border-white/10 bg-black/10 p-4">
            <h3 className="text-sm font-semibold text-white">Bulk CSV import</h3>
            <p className="mt-1 text-xs text-slate-400">
              Upload spreadsheet and confirm before enrollment.
            </p>
            <div className="mt-3 rounded-lg border border-dashed border-emerald-300/40 bg-emerald-400/8 p-3">
              <p className="text-xs text-emerald-200">
                Accepted columns: `full_name`, `phone`, `bvn`
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={onSelectCsv}
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE_CSV)}`}
                download="omo-members-template.csv"
                className={buttonVariants({ variant: 'outline', className: 'justify-center' })}
              >
                <Download className="size-4" />
                Download template
              </a>
              <button
                type="button"
                onClick={onPickCsv}
                className={buttonVariants({ className: 'justify-center' })}
              >
                <FileSpreadsheet className="size-4" />
                {selectedFileName ? 'Change CSV file' : 'Choose CSV file'}
              </button>
            </div>

            {selectedFileName ? (
              <p className="mt-2 text-xs text-slate-300">
                Selected file: <span className="font-medium text-white">{selectedFileName}</span>
              </p>
            ) : null}

            {rows.length > 0 ? (
              <div className="mt-4 space-y-2 rounded-lg border border-white/10 bg-slate-900/50 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Rows detected</span>
                  <span className="font-medium text-white">{rows.length} members</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Valid rows</span>
                  <span className="font-medium text-emerald-300">{validRows.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Needs review</span>
                  <span className="font-medium text-amber-300">{invalidRows}</span>
                </div>

                <div className="overflow-x-auto rounded-md border border-white/10">
                  <table className="w-full min-w-[420px] text-left text-[11px]">
                    <thead className="bg-black/25 text-slate-300">
                      <tr>
                        <th className="px-2 py-1.5">Full name</th>
                        <th className="px-2 py-1.5">Phone</th>
                        <th className="px-2 py-1.5">BVN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((row, idx) => (
                        <tr
                          key={`${row.phone}-${idx}`}
                          className="border-t border-white/10 text-slate-200"
                        >
                          <td className="px-2 py-1.5">{row.full_name || '-'}</td>
                          <td className="px-2 py-1.5">{row.phone || '-'}</td>
                          <td className="px-2 py-1.5">{row.bvn || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rows.length > 5 ? (
                  <p className="text-[11px] text-slate-400">Showing first 5 rows.</p>
                ) : null}

                <button
                  type="button"
                  onClick={onDummyUpload}
                  disabled={isUploading}
                  className={buttonVariants({ className: 'mt-2 w-full justify-center' })}
                >
                  {isUploading ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  {isUploading ? 'Uploading...' : 'Upload members'}
                </button>
                {uploadState === 'done' ? (
                  <p className="text-[11px] text-emerald-300">Upload complete.</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
