let rawData = [];
let iso2ById = {};

// Charger le mapping ISO depuis le fichier CSV et les données ransomware depuis l'API
Promise.all([
  d3.csv("data/pays.csv"),  
  d3.json("https://data.ransomware.live/posts.json")
]).then(([mappingData, postsData]) => {
  // Créer l'objet de mapping à partir du CSV
  mappingData.forEach(d => {
    iso2ById[d.iso_numeric] = d.iso_alpha2;
  });

  rawData = postsData;
  rawData.forEach(d => d.date = new Date(d.published));
  const latestDate = d3.max(rawData, d => d.date);

  // Initialisation des inputs pour les graphiques d'attaques
  document.getElementById("day-input").value = latestDate.toISOString().split("T")[0];
  document.getElementById("month-input").value = latestDate.toISOString().slice(0, 7);
  document.getElementById("year-input").value = latestDate.getFullYear();

  updateDailyChart();
  updateMonthlyChart();
  updateYearlyChart();

  // Carte du monde
  const mapYearInput = document.getElementById("map-year-input");
  mapYearInput.value = latestDate.getFullYear();
  updateWorldMap(+mapYearInput.value);

  document.getElementById("day-input").addEventListener("change", updateDailyChart);
  document.getElementById("month-input").addEventListener("change", updateMonthlyChart);
  document.getElementById("year-input").addEventListener("change", updateYearlyChart);
  mapYearInput.addEventListener("change", () => {
    updateWorldMap(+mapYearInput.value);
  });

  // Initialisation des inputs pour les Groupes
  const groupDayInput = document.getElementById("group-day-input");
  const groupMonthInput = document.getElementById("group-month-input");
  const groupYearInput = document.getElementById("group-year-input");

  groupDayInput.value = latestDate.toISOString().split("T")[0];
  groupMonthInput.value = latestDate.toISOString().slice(0, 7);
  groupYearInput.value = latestDate.getFullYear();

  updateGroupDailyChart();
  updateGroupMonthlyChart();
  updateGroupYearlyChart();

  groupDayInput.addEventListener("change", updateGroupDailyChart);
  groupMonthInput.addEventListener("change", updateGroupMonthlyChart);
  groupYearInput.addEventListener("change", updateGroupYearlyChart);

  // Dernière attaque
  updateLastAttackInfo();

  // Recherche d'un groupe
  document.getElementById("search-group-btn").addEventListener("click", searchGroup);
  document.getElementById("search-group-input").addEventListener("keyup", (e) => {
    if (e.key === "Enter") searchGroup();
  });
});

// ------------------------------
// 3) Fonctions de mise à jour des graphiques d'attaques
// ------------------------------
function updateDailyChart() {
  const val = document.getElementById("day-input").value;
  if (!val) return;
  const selDate = new Date(val);
  const filtered = rawData.filter(d =>
    d.date.getFullYear() === selDate.getFullYear() &&
    d.date.getMonth() === selDate.getMonth() &&
    d.date.getDate() === selDate.getDate()
  );
  const attacksByHour = d3.range(24).map(h => ({
    hour: h,
    count: filtered.filter(d => d.date.getHours() === h).length
  }));
  drawBarChart("#chart-day", attacksByHour,
               d => d.hour, d => d.count, d => d,
               "Attaques par Heure (" + selDate.toLocaleDateString() + ")");
}

function updateMonthlyChart() {
  const val = document.getElementById("month-input").value;
  if (!val) return;
  const [year, month] = val.split("-").map(Number);
  const filtered = rawData.filter(d =>
    d.date.getFullYear() === year && d.date.getMonth() === (month - 1)
  );
  const daysInMonth = new Date(year, month, 0).getDate();
  const attacksByDay = d3.range(1, daysInMonth + 1).map(day => ({
    day: day,
    count: filtered.filter(d => d.date.getDate() === day).length
  }));
  drawBarChart("#chart-month", attacksByDay,
               d => d.day, d => d.count, d => d,
               "Attaques par Jour (" + month + "/" + year + ")");
}

function updateYearlyChart() {
  const val = +document.getElementById("year-input").value;
  if (!val) return;
  const filtered = rawData.filter(d => d.date.getFullYear() === val);
  const attacksByMonth = d3.range(12).map(m => ({
    month: m,
    count: filtered.filter(d => d.date.getMonth() === m).length
  }));
  const monthNames = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];
  drawBarChart("#chart-year", attacksByMonth,
               d => d.month, d => d.count, d => monthNames[d],
               "Attaques par Mois (Année: " + val + ")");
}

// ------------------------------
// 4) Fonction de tracé générique (Bar Chart vertical)
// ------------------------------
function drawBarChart(svgSelector, data, xValue, yValue, xTickFormat, chartTitle) {
  const svg = d3.select(svgSelector);
  svg.selectAll("*").remove();
  const margin = { top: 32, right: 16, bottom: 40, left: 40 };
  const width = parseInt(svg.style("width")) - margin.left - margin.right;
  const height = parseInt(svg.style("height")) - margin.top - margin.bottom;
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const xScale = d3.scaleBand()
                   .domain(data.map(xValue))
                   .range([0, width])
                   .padding(0.1);
  const yScale = d3.scaleLinear()
                   .domain([0, d3.max(data, yValue)])
                   .nice()
                   .range([height, 0]);
  g.selectAll(".bar")
   .data(data)
   .enter().append("rect")
     .attr("class", "bar")
     .attr("x", d => xScale(xValue(d)))
     .attr("y", d => yScale(yValue(d)))
     .attr("width", xScale.bandwidth())
     .attr("height", d => height - yScale(yValue(d)));
  g.append("g")
   .attr("transform", `translate(0,${height})`)
   .attr("class", "axis axis--x")
   .call(d3.axisBottom(xScale).tickFormat(xTickFormat));
  g.append("g")
   .attr("class", "axis axis--y")
   .call(d3.axisLeft(yScale));
  svg.append("text")
     .attr("x", (width + margin.left + margin.right) / 2)
     .attr("y", margin.top / 2)
     .attr("text-anchor", "middle")
     .style("font-size", "12px")
     .text(chartTitle);
}

// ------------------------------
// 5) Fonction de tracé pour un Horizontal Bar Chart (Groupes)
// ------------------------------
function drawHorizontalBarChart(svgSelector, data, yValue, xValue, yTickFormat, chartTitle) {
  const svg = d3.select(svgSelector);
  svg.selectAll("*").remove();
  const margin = { top: 32, right: 80, bottom: 40, left: 100 };
  const width = parseInt(svg.style("width")) - margin.left - margin.right;
  const height = parseInt(svg.style("height")) - margin.top - margin.bottom;
  
  // Trier et prendre les top 10
  data.sort((a, b) => b.count - a.count);
  data = data.slice(0, 10);
  
  const g = svg.append("g")
               .attr("transform", `translate(${margin.left},${margin.top})`);
  const yScale = d3.scaleBand()
                   .domain(data.map(yValue))
                   .range([0, height])
                   .padding(0.1);
  const xScale = d3.scaleLinear()
                   .domain([0, d3.max(data, xValue)])
                   .nice()
                   .range([0, width]);
  
  // Dessiner les barres horizontalement
  g.selectAll(".bar")
   .data(data)
   .enter().append("rect")
     .attr("class", "bar")
     .attr("y", d => yScale(yValue(d)))
     .attr("x", 0)
     .attr("height", yScale.bandwidth())
     .attr("width", d => xScale(xValue(d)))
     .attr("fill", "steelblue");
  
  // Ajouter les étiquettes de valeurs sur les barres
  g.selectAll(".label")
   .data(data)
   .enter().append("text")
     .attr("class", "label")
     .attr("x", d => xScale(xValue(d)) + 5)
     .attr("y", d => yScale(yValue(d)) + yScale.bandwidth() / 2)
     .attr("dy", ".35em")
     .text(d => d.count);
  
  // Axe des Y (noms des groupes)
  g.append("g")
   .attr("class", "axis axis--y")
   .call(d3.axisLeft(yScale).tickFormat(yTickFormat));
  
  // Axe des X (compte)
  g.append("g")
   .attr("transform", `translate(0,${height})`)
   .attr("class", "axis axis--x")
   .call(d3.axisBottom(xScale).ticks(5));
  
  // Titre
  svg.append("text")
     .attr("x", (width + margin.left + margin.right) / 2)
     .attr("y", margin.top / 2)
     .attr("text-anchor", "middle")
     .style("font-size", "12px")
     .text(chartTitle);
}

// ------------------------------
// 6) Mise à jour des graphiques pour les Groupes
// ------------------------------
function updateGroupDailyChart() {
  const val = document.getElementById("group-day-input").value;
  if (!val) return;
  const selDate = new Date(val);
  const filtered = rawData.filter(d =>
    d.date.getFullYear() === selDate.getFullYear() &&
    d.date.getMonth() === selDate.getMonth() &&
    d.date.getDate() === selDate.getDate()
  );
  const groupsCount = Array.from(d3.rollup(
    filtered,
    v => v.length,
    d => d.group_name
  ), ([group, count]) => ({ group, count }));
  
  drawHorizontalBarChart("#chart-group-day", groupsCount,
                          d => d.group, d => d.count,
                          d => d, "Top 10 Groupes (Jour: " + selDate.toLocaleDateString() + ")");
}

function updateGroupMonthlyChart() {
  const val = document.getElementById("group-month-input").value;
  if (!val) return;
  const [year, month] = val.split("-").map(Number);
  const filtered = rawData.filter(d =>
    d.date.getFullYear() === year && d.date.getMonth() === (month - 1)
  );
  const groupsCount = Array.from(d3.rollup(
    filtered,
    v => v.length,
    d => d.group_name
  ), ([group, count]) => ({ group, count }));
  
  drawHorizontalBarChart("#chart-group-month", groupsCount,
                          d => d.group, d => d.count,
                          d => d, "Top 10 Groupes (Mois: " + month + "/" + year + ")");
}

function updateGroupYearlyChart() {
  const val = +document.getElementById("group-year-input").value;
  if (!val) return;
  const filtered = rawData.filter(d => d.date.getFullYear() === val);
  const groupsCount = Array.from(d3.rollup(
    filtered,
    v => v.length,
    d => d.group_name
  ), ([group, count]) => ({ group, count }));
  
  drawHorizontalBarChart("#chart-group-year", groupsCount,
                          d => d.group, d => d.count,
                          d => d, "Top 10 Groupes (Année: " + val + ")");
}

// ------------------------------
// 7) Mise à jour de la Dernière Attaque
// ------------------------------
function updateLastAttackInfo() {
  if (!rawData || rawData.length === 0) return;
  const lastAttack = rawData.reduce((acc, cur) => cur.date > acc.date ? cur : acc);
  document.getElementById("last-attack-title").textContent = lastAttack.post_title || "";
  document.getElementById("last-attack-group").textContent = lastAttack.group_name || "";
  document.getElementById("last-attack-country").textContent = lastAttack.country || "";
  document.getElementById("last-attack-published").textContent = lastAttack.discovered || "";
}

// ------------------------------
// 8) Recherche d'un Groupe
// ------------------------------
function searchGroup() {
  const groupName = document.getElementById("search-group-input").value.trim();
  const resultDiv = document.getElementById("group-search-result");
  resultDiv.innerHTML = "";
  if (!groupName) {
    resultDiv.innerHTML = "<p>Veuillez entrer un nom de groupe.</p>";
    return;
  }
  const filtered = rawData.filter(d =>
    d.group_name && d.group_name.toLowerCase() === groupName.toLowerCase()
  );
  if (filtered.length === 0) {
    resultDiv.innerHTML = `<p>Aucune attaque trouvée pour le groupe "<strong>${groupName}</strong>".</p>`;
    return;
  }
  const totalAttacks = filtered.length;
  const attacksByCountry = d3.rollup(
    filtered,
    v => v.length,
    d => d.country
  );
  const sortedCountries = Array.from(attacksByCountry, ([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count);
  let html = `<p>Groupe : <strong>${groupName}</strong></p>`;
  html += `<p>Nombre total d'attaques : <strong>${totalAttacks}</strong></p>`;
  if (sortedCountries.length > 0) {
    html += `<p>Pays touchés (du plus au moins impacté) :</p><ul>`;
    sortedCountries.forEach(item => {
      html += `<li>${item.country || "N/A"} : ${item.count}</li>`;
    });
    html += `</ul>`;
  } else {
    html += `<p>Aucun pays renseigné.</p>`;
  }
  resultDiv.innerHTML = html;
}

// ------------------------------
// 9) Mise à jour de la Carte du Monde (Heatmap)
// ------------------------------
function updateWorldMap(selectedYear) {
  const svgMap = d3.select("#world-map");
  svgMap.selectAll("*").remove();
  const width = +svgMap.attr("width");
  const height = +svgMap.attr("height");
  const projection = d3.geoNaturalEarth1();
  const path = d3.geoPath(projection);
  const filtered = rawData.filter(d => d.date.getFullYear() === selectedYear);
  const attacksByCountry = d3.rollup(
    filtered,
    v => v.length,
    d => d.country
  );
  const maxAttacks = d3.max([...attacksByCountry.values()]) || 0;
  const colorScale = d3.scaleSequential()
    .domain([0, maxAttacks])
    .interpolator(d3.interpolateReds);

  // Charger le CSV de mapping pays pour enrichir les tooltips
  d3.csv("data/pays.csv").then(paysMapping => {
    const countryNames = {};
    paysMapping.forEach(d => {
      countryNames[d.iso_numeric] = d.country_name;
    });

    // Charger le TopoJSON des pays
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json").then(worldData => {
      const countries = topojson.feature(worldData, worldData.objects.countries).features;
      projection.fitSize([width, height], { type: "FeatureCollection", features: countries });
      svgMap.append("path")
        .datum({ type: "Sphere" })
        .attr("fill", "#4A5472")
        .attr("d", path);
      svgMap.selectAll(".country")
        .data(countries)
        .enter().append("path")
          .attr("class", "country")
          .attr("d", path)
          .attr("stroke", "#333")
          .attr("stroke-width", 0.5)
          .attr("fill", d => {
            const iso2 = iso2ById[d.id];
            if (!iso2) return "#999";
            const val = attacksByCountry.get(iso2) || 0;
            return colorScale(val);
          })
        .append("title")
        .text(d => {
          const iso2 = iso2ById[d.id] || "??";
          const countryName = countryNames[d.id] || iso2;
          const val = attacksByCountry.get(iso2) || 0;
          return `${countryName} (${iso2}) : ${val} attaques en ${selectedYear}`;
        });
      const graticule = d3.geoGraticule();
      svgMap.append("path")
        .datum(graticule())
        .attr("fill", "none")
        .attr("stroke", "#fff")
        .attr("stroke-opacity", 0.1)
        .attr("d", path);
      const legendWidth = 350, legendHeight = 10;
      const legendGroup = svgMap.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - legendWidth - 320},${height - legendHeight - 40})`);
      const defs = svgMap.append("defs");
      const gradient = defs.append("linearGradient")
        .attr("id", "legend-gradient");
      const stops = d3.range(0, 1.01, 0.01);
      gradient.selectAll("stop")
        .data(stops)
        .enter()
        .append("stop")
        .attr("offset", d => `${d * 100}%`)
        .attr("stop-color", d => colorScale(d * maxAttacks));
      legendGroup.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)");
      const legendScale = d3.scaleLinear()
        .domain([0, maxAttacks])
        .range([0, legendWidth]);
      const legendAxis = d3.axisBottom(legendScale)
        .ticks(5)
        .tickFormat(d3.format("d"));
      legendGroup.append("g")
        .attr("transform", `translate(0,${legendHeight})`)
        .call(legendAxis);
    });
  });
}
