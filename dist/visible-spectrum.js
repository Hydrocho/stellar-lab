'use strict';

// Same wavelength-form Planck model as the graph. Values are relative radiance.
function spectralRadiance(wavelength, temperature) {
  return 1 / (wavelength ** 5 * Math.expm1(14387770 / (wavelength * temperature)));
}

function visibleSpectrum(temperature) {
  const wavelengths = Array.from({length: 81}, (_, i) => 380 + i * 5);
  const maximum = Math.max(...wavelengths.map(w => spectralRadiance(w, temperature)));
  const relative = w => spectralRadiance(w, temperature) / maximum;
  // Illustrative wavelength-to-screen-color mapping, not a colorimetric simulation.
  const anchors = [[380, .55, 0, 1], [440, .12, 0, 1], [490, 0, .75, 1],
    [510, 0, 1, .2], [550, .65, 1, 0], [580, 1, 1, 0],
    [610, 1, .35, 0], [650, 1, 0, 0], [780, 1, 0, 0]];
  const encode = linear => Math.round(255 * (linear <= .0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - .055));
  const color = w => {
    const upper = anchors.findIndex(a => a[0] >= w);
    const a = anchors[Math.max(0, upper - 1)], b = anchors[upper];
    const f = a === b ? 0 : (w - a[0]) / (b[0] - a[0]);
    return `rgb(${[1, 2, 3].map(c => encode((a[c] + f * (b[c] - a[c])) * relative(w))).join(',')})`;
  };
  const values = [450, 550, 650].map(w => Math.round(relative(w) * 100));
  const strips = wavelengths.slice(0, -1).map((w, i) => `<rect x="${i * 4}" y="0" width="5" height="48" fill="${color(w + 2.5)}"/>`).join('');
  return `<section class="visible-spectrum" aria-label="가시광선 분광 관측">
    <div class="spectrum-heading"><strong>가시광선 분광 관측</strong><span>380–780 nm 확대</span></div>
    <svg class="spectrum-strip" viewBox="0 0 320 48" preserveAspectRatio="none" role="img" aria-label="파장별 세기를 밝기로 나타낸 연속 스펙트럼. 청색 ${values[0]}, 녹색 ${values[1]}, 적색 ${values[2]}. 가시광선 최대 세기 100 기준.">${strips}</svg>
    <div class="spectrum-ticks"><span>380</span><span>480</span><span>580</span><span>680</span><span>780 nm</span></div>
    <div class="spectrum-readings">${['청색', '녹색', '적색'].map((name, i) => `<div><span><i style="background:${['#6e99ff', '#7ee58c', '#ff7773'][i]}"></i>${name} <small>${[450,550,650][i]} nm</small></span><strong>${values[i]}</strong><div class="reading-track"><b style="width:${values[i]}%;background:${['#6e99ff', '#7ee58c', '#ff7773'][i]}"></b></div></div>`).join('')}</div>
    <p>밝게 보이는 영역일수록 빛의 세기가 강해요.</p>
    <small class="spectrum-note">이 별의 가시광선 최대 세기 = 100. 별 사이의 전체 밝기 비교가 아닌 파장별 상대 비교예요. 화면 색은 모식 표현이며, 흡수선은 생략했어요.</small>
  </section>`;
}
