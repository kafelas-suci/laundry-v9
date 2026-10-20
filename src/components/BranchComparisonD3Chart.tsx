import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Building2, Trophy, ArrowUpRight, TrendingUp, Filter, BarChart3, HelpCircle, Layers } from 'lucide-react';
import { formatRupiah } from '../utils/formatters';

export interface BranchPerformanceData {
  branchId: string;
  branchName: string;
  totalOmzet: number;
  totalUangMasuk: number;
  totalTrx: number;
  aov: number; // Average Order Value
  percentageContribution: number;
  address?: string | null;
  phone?: string | null;
}

interface BranchComparisonD3ChartProps {
  data: BranchPerformanceData[];
  periodeLabel: string;
  onSelectBranch?: (branchId: string) => void;
  activeBranchId?: string;
}

type MetricType = 'omzet' | 'uangMasuk' | 'trx' | 'aov';
type SortType = 'desc' | 'asc' | 'name';

export const BranchComparisonD3Chart: React.FC<BranchComparisonD3ChartProps> = ({
  data,
  periodeLabel,
  onSelectBranch,
  activeBranchId,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [selectedMetric, setSelectedMetric] = useState<MetricType>('omzet');
  const [sortOrder, setSortOrder] = useState<SortType>('desc');
  const [hoveredBranch, setHoveredBranch] = useState<BranchPerformanceData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Urutkan data berdasarkan metrik dan pilihan sortir
  const sortedData = useMemo(() => {
    const list = [...data];
    if (sortOrder === 'name') {
      return list.sort((a, b) => a.branchName.localeCompare(b.branchName));
    }
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    return list.sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (selectedMetric === 'omzet') {
        valA = a.totalOmzet;
        valB = b.totalOmzet;
      } else if (selectedMetric === 'uangMasuk') {
        valA = a.totalUangMasuk;
        valB = b.totalUangMasuk;
      } else if (selectedMetric === 'trx') {
        valA = a.totalTrx;
        valB = b.totalTrx;
      } else {
        valA = a.aov;
        valB = b.aov;
      }
      return (valA - valB) * multiplier;
    });
  }, [data, selectedMetric, sortOrder]);

  // Cabang Terproduktif (Peringkat #1 berdasarkan Omzet)
  const topBranch = useMemo(() => {
    if (data.length === 0) return null;
    return [...data].sort((a, b) => b.totalOmzet - a.totalOmzet)[0];
  }, [data]);

  const totalAllOmzet = useMemo(() => {
    return data.reduce((sum, item) => sum + item.totalOmzet, 0);
  }, [data]);

  // Render D3.js Chart
  useEffect(() => {
    if (!svgRef.current || sortedData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const margin = { top: 25, right: 115, bottom: 35, left: 160 };
    const width = 680;
    // Dynamic height based on number of branches (minimal 220px)
    const barHeight = Math.max(38, Math.min(56, 260 / sortedData.length));
    const innerHeight = sortedData.length * barHeight;
    const height = innerHeight + margin.top + margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', 'auto');

    // Definisikan Gradients D3
    const defs = svg.append('defs');

    // 1. Gradient Marun (#800000 ke #a81c1c) untuk Juara / Top Branch
    const gradMaroon = defs.append('linearGradient')
      .attr('id', 'd3-grad-maroon')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '0%');
    gradMaroon.append('stop').attr('offset', '0%').attr('stop-color', '#800000');
    gradMaroon.append('stop').attr('offset', '100%').attr('stop-color', '#a81c1c');

    // 2. Gradient Indigo/Navy untuk Cabang Reguler
    const gradNavy = defs.append('linearGradient')
      .attr('id', 'd3-grad-navy')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '0%');
    gradNavy.append('stop').attr('offset', '0%').attr('stop-color', '#1e293b');
    gradNavy.append('stop').attr('offset', '100%').attr('stop-color', '#334155');

    // 3. Gradient Emerald untuk Uang Masuk
    const gradEmerald = defs.append('linearGradient')
      .attr('id', 'd3-grad-emerald')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '0%');
    gradEmerald.append('stop').attr('offset', '0%').attr('stop-color', '#047857');
    gradEmerald.append('stop').attr('offset', '100%').attr('stop-color', '#10b981');

    // Group wrapper
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Helper Nilai Metrik
    const getVal = (d: BranchPerformanceData) => {
      if (selectedMetric === 'omzet') return d.totalOmzet;
      if (selectedMetric === 'uangMasuk') return d.totalUangMasuk;
      if (selectedMetric === 'trx') return d.totalTrx;
      return d.aov;
    };

    const maxVal = d3.max(sortedData, getVal) || 1;

    // Scales
    const yScale = d3.scaleBand()
      .domain(sortedData.map((d) => d.branchName))
      .range([0, innerHeight])
      .padding(0.24);

    const xScale = d3.scaleLinear()
      .domain([0, maxVal * 1.15]) // Tambah buffer 15% agar label nilai muat rapi
      .range([0, width - margin.left - margin.right]);

    // Grid garis putus-putus halus (X-Axis Grid)
    const xGrid = d3.axisBottom(xScale)
      .ticks(5)
      .tickSize(innerHeight)
      .tickFormat(() => '');

    g.append('g')
      .attr('class', 'grid')
      .call(xGrid)
      .selectAll('line')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-dasharray', '3,3');
    g.select('.grid .domain').remove();

    // Sumbu Y (Nama-nama Cabang)
    const yAxis = d3.axisLeft(yScale).tickSize(0).tickPadding(12);

    const yAxisGroup = g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis);

    yAxisGroup.select('.domain').remove();
    yAxisGroup.selectAll('text')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .attr('fill', '#334155')
      .style('cursor', 'pointer')
      .text((d: any) => {
        const str = String(d);
        return str.length > 18 ? `${str.slice(0, 17)}…` : str;
      })
      .on('click', (_event: any, d: any) => {
        const found = sortedData.find((b) => b.branchName === d);
        if (found && onSelectBranch) onSelectBranch(found.branchId);
      });

    // Background track bar (batang bayangan abu-abu lembut)
    g.selectAll('.bar-track')
      .data(sortedData)
      .enter()
      .append('rect')
      .attr('class', 'bar-track')
      .attr('y', (d) => yScale(d.branchName) || 0)
      .attr('x', 0)
      .attr('height', yScale.bandwidth())
      .attr('width', width - margin.left - margin.right)
      .attr('rx', 6)
      .attr('fill', '#f1f5f9');

    // Bar Utama dengan Transisi Animasi D3
    const bars = g.selectAll('.bar')
      .data(sortedData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('y', (d) => yScale(d.branchName) || 0)
      .attr('x', 0)
      .attr('height', yScale.bandwidth())
      .attr('rx', 6)
      .attr('fill', (d) => {
        const isTop = topBranch && d.branchId === topBranch.branchId;
        const isActive = activeBranchId && d.branchId === activeBranchId;
        if (isTop) return 'url(#d3-grad-maroon)';
        if (selectedMetric === 'uangMasuk') return 'url(#d3-grad-emerald)';
        if (isActive) return '#0284c7';
        return 'url(#d3-grad-navy)';
      })
      .style('cursor', 'pointer')
      .attr('width', 0); // Mulai dari 0 untuk animasi entrance

    // Animasi entrance D3
    bars.transition()
      .duration(750)
      .ease(d3.easeCubicOut)
      .attr('width', (d) => Math.max(6, xScale(getVal(d))));

    // Interaktivitas Hover D3
    bars
      .on('mouseenter', function (event: MouseEvent, d: BranchPerformanceData) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('opacity', 0.82)
          .attr('stroke', '#800000')
          .attr('stroke-width', 2);

        setHoveredBranch(d);
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltipPos({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }
      })
      .on('mousemove', function (event: MouseEvent) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltipPos({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }
      })
      .on('mouseleave', function () {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('opacity', 1)
          .attr('stroke', 'none');

        setHoveredBranch(null);
        setTooltipPos(null);
      })
      .on('click', (_event: any, d: BranchPerformanceData) => {
        if (onSelectBranch) onSelectBranch(d.branchId);
      });

    // Label Nilai di Ujung Bar (Formatted Numerals)
    const labels = g.selectAll('.val-label')
      .data(sortedData)
      .enter()
      .append('text')
      .attr('class', 'val-label')
      .attr('y', (d) => (yScale(d.branchName) || 0) + yScale.bandwidth() / 2 + 4)
      .attr('x', 0)
      .attr('font-size', '11px')
      .attr('font-weight', '800')
      .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace')
      .attr('fill', '#0f172a')
      .text((d) => {
        const val = getVal(d);
        if (selectedMetric === 'trx') return `${val} Nota`;
        return formatRupiah(val);
      });

    labels.transition()
      .duration(750)
      .ease(d3.easeCubicOut)
      .attr('x', (d) => xScale(getVal(d)) + 8);

    // X-Axis di Bawah
    const xAxis = d3.axisBottom(xScale)
      .ticks(4)
      .tickFormat((d) => {
        const n = Number(d);
        if (selectedMetric === 'trx') return `${n}`;
        if (n >= 1000000) return `Rp ${(n / 1000000).toFixed(1)}Jt`;
        if (n >= 1000) return `Rp ${(n / 1000).toFixed(0)}Rb`;
        return `Rp ${n}`;
      })
      .tickSize(4);

    const xAxisGroup = g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    xAxisGroup.select('.domain').attr('stroke', '#cbd5e1');
    xAxisGroup.selectAll('text')
      .attr('font-size', '9px')
      .attr('font-weight', '600')
      .attr('fill', '#64748b');

  }, [sortedData, selectedMetric, topBranch, activeBranchId, onSelectBranch]);

  return (
    <div ref={containerRef} className="space-y-4 relative">
      {/* 1. KONTROL FILTER & METRIK */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
        {/* Metric Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold border border-slate-200/80">
          <button
            type="button"
            onClick={() => setSelectedMetric('omzet')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
              selectedMetric === 'omzet'
                ? 'bg-[#800000] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Total Omzet
          </button>
          <button
            type="button"
            onClick={() => setSelectedMetric('uangMasuk')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
              selectedMetric === 'uangMasuk'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Uang Kas Masuk
          </button>
          <button
            type="button"
            onClick={() => setSelectedMetric('trx')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
              selectedMetric === 'trx'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Jumlah Order
          </button>
          <button
            type="button"
            onClick={() => setSelectedMetric('aov')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
              selectedMetric === 'aov'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rata-rata/Nota
          </button>
        </div>

        {/* Sort Order Selector */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs text-slate-500">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-[11px]">Urutan:</span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortType)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#800000] cursor-pointer"
          >
            <option value="desc">Tertinggi ke Terendah</option>
            <option value="asc">Terendah ke Tertinggi</option>
            <option value="name">Nama Cabang (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Informative banner if only 1 branch exists */}
      {data.length <= 1 && (
        <div className="bg-sky-50 border border-sky-200 text-sky-900 rounded-2xl p-3.5 text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-sky-700" />
            </div>
            <div>
              <span className="font-bold block text-sky-950">1 Cabang Terdaftar</span>
              <span className="text-[11px] text-sky-800">
                Data di bawah menampilkan performa cabang utama. Jika Anda memiliki cabang ke-2 atau ke-3, tambahkan di menu <strong>Kelola Owner &gt; Tambah Cabang</strong> agar grafik D3.js membandingkan performa otomatis.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. CARD JUARA / CABANG TERPRODUKTIF #1 */}
      {topBranch && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-50/70 to-rose-50/60 border border-amber-300/80 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300/60">
                  Cabang Terproduktif #1
                </span>
                <span className="text-slate-400 text-xs">·</span>
                <span className="text-xs text-slate-500">{periodeLabel}</span>
              </div>
              <h3 className="text-base font-black text-slate-900 mt-0.5">
                {topBranch.branchName}
              </h3>
              <p className="text-[11px] text-slate-500">
                Menyumbang <strong>{topBranch.percentageContribution.toFixed(1)}%</strong> dari total seluruh omzet bisnis laundry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-amber-200/80 pt-2 sm:pt-0 sm:pl-5 text-right">
            <div>
              <span className="text-[10px] text-slate-500 block font-semibold">Total Omzet</span>
              <span className="text-base sm:text-lg font-black text-[#800000] font-mono tabular-nums">
                {formatRupiah(topBranch.totalOmzet)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block font-semibold">Volume Order</span>
              <span className="text-sm sm:text-base font-black text-slate-800 font-mono tabular-nums">
                {topBranch.totalTrx} Nota
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. CANVAS D3.JS SVG CHART */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-2">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#800000]" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              Grafik Komparasi Antar-Cabang (D3.js)
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {sortedData.length} Cabang Terdata
          </span>
        </div>

        {/* SVG Container */}
        <div className="w-full overflow-x-auto">
          <svg ref={svgRef} className="w-full select-none" />
        </div>

        {/* Tooltip Mengambang D3 */}
        {hoveredBranch && tooltipPos && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-900/95 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-slate-700 max-w-xs animate-fade-in backdrop-blur-xs"
            style={{
              left: `${Math.min(tooltipPos.x + 12, (containerRef.current?.clientWidth || 300) - 180)}px`,
              top: `${tooltipPos.y + 12}px`,
            }}
          >
            <div className="font-extrabold text-white text-xs border-b border-slate-700/80 pb-1 flex items-center justify-between gap-2">
              <span className="truncate">
                {typeof hoveredBranch.branchName === 'object' ? (hoveredBranch.branchName as any)?.namaLaundry || "Cabang" : hoveredBranch.branchName}
              </span>
              <span className="text-amber-400 font-mono text-[10px]">
                {hoveredBranch.percentageContribution.toFixed(1)}%
              </span>
            </div>
            <div className="space-y-0.5 text-[11px] text-slate-300 font-medium">
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Total Omzet:</span>
                <span className="font-bold text-white font-mono">{formatRupiah(hoveredBranch.totalOmzet)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Uang Kas Masuk:</span>
                <span className="font-bold text-emerald-400 font-mono">{formatRupiah(hoveredBranch.totalUangMasuk)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Jumlah Pesanan:</span>
                <span className="font-bold text-white font-mono">{hoveredBranch.totalTrx} Nota</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Rata-rata/Nota:</span>
                <span className="font-bold text-sky-400 font-mono">{formatRupiah(hoveredBranch.aov)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
          <span>💡 Sentuh atau arahkan kursor ke batang chart untuk melihat perincian detail cabang</span>
          <span className="font-semibold text-slate-500">D3.js Visualization</span>
        </div>
      </div>

      {/* 4. TABEL KLASEMEN LEADERBOARD PER CABANG */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="bg-slate-50/90 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700">
            Klasemen Produktivitas Seluruh Cabang
          </span>
          <span className="text-xs font-bold text-slate-500 font-mono">
            Total Omzet: {formatRupiah(totalAllOmzet)}
          </span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {sortedData.map((branch, idx) => {
            const isWinner = topBranch && branch.branchId === topBranch.branchId;
            return (
              <div
                key={branch.branchId}
                onClick={() => onSelectBranch && onSelectBranch(branch.branchId)}
                className={`p-3 sm:p-4 flex items-center justify-between hover:bg-slate-50/80 transition cursor-pointer ${
                  activeBranchId === branch.branchId ? 'bg-amber-50/50' : ''
                }`}
              >
                {/* Ranking & Identitas Cabang */}
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                      isWinner
                        ? 'bg-amber-400 text-slate-950 shadow-xs'
                        : idx === 1
                        ? 'bg-slate-200 text-slate-700'
                        : idx === 2
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    #{idx + 1}
                  </div>

                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5 truncate">
                      <span>{typeof branch.branchName === 'object' ? (branch.branchName as any)?.namaLaundry || "Cabang" : branch.branchName}</span>
                      {isWinner && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                          Top #1
                        </span>
                      )}
                      {activeBranchId === branch.branchId && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 border border-sky-300 shrink-0">
                          Aktif
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{branch.totalTrx} Transaksi</span>
                      <span>·</span>
                      <span>AOV: {formatRupiah(branch.aov)}</span>
                    </div>
                  </div>
                </div>

                {/* Angka Omzet & Kontribusi */}
                <div className="text-right shrink-0">
                  <div className="text-xs sm:text-sm font-black text-slate-900 font-mono tabular-nums">
                    {formatRupiah(branch.totalOmzet)}
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                      <div
                        className="bg-[#800000] h-full rounded-full"
                        style={{ width: `${Math.min(100, branch.percentageContribution)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 font-mono">
                      {branch.percentageContribution.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
