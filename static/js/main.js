const xSize = 500;
const ySize = 500;
const margin = 40;
const xMax = xSize - margin * 2;
const yMax = ySize - margin * 2;

let x, y;
let coefs;
let entries = [];

let avgTaxPercentage = 0;

let colors = d3.scaleLinear()
    .domain([0, 1])
    .range(["#093f5e", "#3fb1f2"]);

window.addEventListener('load', async (event) => {
    let makeddl = document.getElementById("make");
    makeddl.addEventListener("change", changeMake);

    let modelddl = document.getElementById("model");
    modelddl.addEventListener("change", changeModel);

    let tf = document.getElementById("mileage");
    tf.addEventListener("change", rangeChanged);

    tf = document.getElementById("kw");
    tf.addEventListener("change", rangeChanged);

    tf = document.getElementById("age");
    tf.addEventListener("change", rangeChanged);

    tf = document.getElementById("valueMileage");
    tf.addEventListener("change", valueChanged);

    tf = document.getElementById("valueKw");
    tf.addEventListener("change", valueChanged);

    tf = document.getElementById("valueAge");
    tf.addEventListener("change", valueChanged);

    tf = document.getElementById("valueTaxPercentage");
    tf.addEventListener("change", valueChanged);

    await loadMakes();

    await updateGraph(entries, 500, 500);
});

async function loadMakes() {
    let response = await fetch('/api/make');
    updateList("make", await response.json());
}

async function loadModels(make) {
    let response = await fetch(`/api/make/${make}/models`);
    updateList("model", await response.json());
}

async function loadEntries(make, model) {
    let response = await fetch(`/api/entries/${make}/${model}`);

    entries = await response.json()
    updateTable("entries", entries);

    if (entries.length > 0) {
        maxX = Math.max(...entries.map(e => e.Mittarilukema))
        maxY = Math.max(...entries.map(e => e.Verotusarvo))
        updateGraph(entries, maxX, maxY);

        if (entries.length > 10) {
            await loadCoefs(make, model);
            updateRanges();
            updatePrediction();
        } else {
            let tf = document.getElementById("age");
            tf.setAttribute("disabled", "");
            tf = document.getElementById("valueAge");
            tf.value = "";

            tf = document.getElementById("mileage");
            tf.setAttribute("disabled", "");
            tf = document.getElementById("valueMileage");
            tf.value = "";

            tf = document.getElementById("kw");
            tf.setAttribute("disabled", "");
            tf = document.getElementById("valueKw");
            tf.value = "";

            tf = document.getElementById("entryCount");
            tf.innerHTML = entries.length;

        }
    }
}


async function loadCoefs(make, model) {
    let response = await fetch(`/api/coeffs/${make}/${model}`);
    coefs = await response.json()

    maxX = Math.max(...entries.map(e => e.Mittarilukema));

    let lreg = calculateLinearValues(coefs, 0, maxX, 4);

    const svg = d3.select("#graph > svg > g");

    // udpate Y Axis
    maxY = Math.max(...entries.map(e => e.Verotusarvo)) * 1.1;
    y.domain([0, maxY]);

    svg.selectAll("g.yaxis")
        .transition().duration(1000)
        .call(d3.axisLeft(y));

    let line = d3.line()
        .x((d) => x(d[0]))
        .y((d) => y(d[1]));

    svg
        .append("g")
        .append("path")
        .attr("d", line(lreg))
        .style("stroke", "red")
        .style("stroke-width", "4px");
}

function updateList(listId, items) {
    if (items.length == 0) {
        return;
    }

    // clear previous nodes
    let ddl = document.getElementById(listId);
    let child = ddl.lastElementChild;
    while (child) {
        ddl.removeChild(child);
        child = ddl.lastElementChild;
    }

    var option = document.createElement("option");
    option.setAttribute("disabled", "");
    option.setAttribute("selected", "");
    option.innerHTML = "Valitse";
    ddl.appendChild(option);

    // add new ones
    items.forEach(m => {
        option = document.createElement("option");
        option.innerHTML = m;
        ddl.appendChild(option);
    });
}

function updateRanges() {
    let averageAge = Math.round(entries.reduce(function (a, b) {
        return {
            Ikä: a.Ikä + b.Ikä
        }
    }, {
        Ikä: 0
    }).Ikä / entries.length / 365);

    let averageMileage = Math.round(entries.reduce(function (a, b) {
        return {
            Mittarilukema: a.Mittarilukema + b.Mittarilukema
        }
    }, {
        Mittarilukema: 0
    }).Mittarilukema / entries.length);

    let averagePower = Math.round(entries.reduce(function (a, b) {
        return {
            Kw: a.Kw + b.Kw
        }
    }, {
        Kw: 0
    }).Kw / entries.length);

    let avgTaxPercentage = Math.round(entries.reduce(function (a, b) {
        return {
            Veroprosentti: a.Veroprosentti + b.Veroprosentti
        }
    }, {
        Veroprosentti: 0
    }).Veroprosentti / entries.length);

    let maxMileage = Math.max(...entries.map(e => e.Mittarilukema));
    let maxAge = Math.round(Math.max(...entries.map(e => e.Ikä)) / 365);
    let maxPower = Math.max(...entries.map(e => e.Kw));

    let tf = document.getElementById("mileage");
    tf.removeAttribute("disabled");
    tf.setAttribute("min", 0);
    tf.setAttribute("max", maxMileage);
    tf.value = averageMileage;

    tf = document.getElementById("age");
    tf.removeAttribute("disabled");
    tf.setAttribute("min", 0);
    tf.setAttribute("max", maxAge);
    tf.value = averageAge;

    tf = document.getElementById("kw");
    tf.removeAttribute("disabled");
    tf.setAttribute("min", 0);
    tf.setAttribute("max", maxPower);
    tf.value = averagePower;

    tf = document.getElementById("valueMileage");
    tf.value = averageMileage;

    tf = document.getElementById("valueAge");
    tf.value = averageAge;

    tf = document.getElementById("valueKw");
    tf.value = averagePower;

    tf = document.getElementById("valueTaxPercentage");
    tf.removeAttribute("disabled");
    tf.value = avgTaxPercentage;

    tf = document.getElementById("usedPercentage");
    tf.value = avgTaxPercentage;

    tf = document.getElementById("valueTax");
    tf.removeAttribute("disabled");
    tf.value = "";

    tf = document.getElementById("entryCount");
    tf.innerHTML = entries.length;
}

function calc(e, coefs) {
    return coefs[1] + coefs[0][0] * e.Mittarilukema + coefs[0][1] * e.Ikä + coefs[0][2] * e.Kw;
}

function calculateLinearValues(coefs, start, end, steps) {
    let values = []
    /*
    for (let i = start; i <= end; i = i + ((end - start) / steps)) {
        values.push([i, i * coefs[0][0] + coefs[1]]);
    }
    */

    let mileageMin = entries.reduce(function (prev, curr) {
        return prev.Mittarilukema < curr.Mittarilukema ? prev : curr;
    });

    let mileageMax = entries.reduce((prev, curr) => {
        return prev.Mittarilukema > curr.Mittarilukema ? prev : curr;
    });

    values.push([mileageMin.Mittarilukema, calc(mileageMin, coefs)]);
    values.push([mileageMax.Mittarilukema, calc(mileageMax, coefs)]);

    return values;
}

async function changeMake(evt) {
    let ddl = document.getElementById("make");
    let selectedMake = ddl.options[ddl.selectedIndex].text;

    let tf = document.getElementById("mileage");
    tf.setAttribute("disabled", "");

    tf = document.getElementById("age");
    tf.setAttribute("disabled", "");

    tf = document.getElementById("kw");
    tf.setAttribute("disabled", "");

    await loadModels(selectedMake);

    let models = document.getElementById("model");
    models.removeAttribute("disabled");

    tf = document.getElementById("valueTax");
    tf.innerHTML = "TBD"

    tf = document.getElementById("valueTaxPercentage");
    tf.setAttribute("disabled", "");

    tf = document.getElementById("usedPercentage");
    tf.value = "?";


    tf = document.getElementById("entryCount");
    tf.innerHTML = 0;

    clearEntries();
}

function changeModel(evt) {
    let ddl = document.getElementById("make");
    let selectedMake = ddl.options[ddl.selectedIndex].text;

    ddl = document.getElementById("model");
    let selectedModel = ddl.options[ddl.selectedIndex].text;

    let tf = document.getElementById("mileage");
    tf.removeAttribute("disabled");

    tf = document.getElementById("valueKw");
    tf.removeAttribute("disabled");

    tf = document.getElementById("valueTaxPercentage");
    tf.removeAttribute("disabled");

    loadEntries(selectedMake, selectedModel);
}

function clearEntries() {
    let table = document.getElementById("entries");
    let tbody = table.getElementsByTagName("tbody")[0];
    let child = tbody.lastElementChild;
    while (child) {
        tbody.removeChild(child);
        child = tbody.lastElementChild;
    }
}

function clearMileage() {
    let tf = document.getElementById("mileage");
    tf.value = "";
}

function clearAge() {
    let tf = document.getElementById("age");
    tf.value = "";
}

function rangeChanged(event) {
    document.getElementById("valueMileage").value = document.getElementById("mileage").valueAsNumber;
    document.getElementById("valueAge").value = document.getElementById("age").valueAsNumber;
    document.getElementById("valueKw").value = document.getElementById("kw").valueAsNumber;

    updatePrediction();
}

function valueChanged(event) {
    document.getElementById("mileage").value = document.getElementById("valueMileage").valueAsNumber;
    document.getElementById("age").value = document.getElementById("valueAge").valueAsNumber;
    document.getElementById("kw").value = document.getElementById("valueKw").valueAsNumber;

    updatePrediction();
}

function updatePrediction(event) {
    let mileage = document.getElementById("mileage").value * 1;
    let age = document.getElementById("age").valueAsNumber * 365;
    let taxPercentage = document.getElementById("valueTaxPercentage").value * 1;
    let power = document.getElementById("kw").value * 1;

    let ycoord = calc({
        "Mittarilukema": mileage,
        "Ikä": age,
        "Kw": power,
    }, coefs);

    document.getElementById("valueTax").innerHTML = Math.round(ycoord);
    document.getElementById("calculatedTax").innerHTML = Math.round(ycoord * (taxPercentage / 100.0));
    document.getElementById("usedPercentage").innerHTML = taxPercentage;

    let coords = [
        [mileage, 0],
        [mileage, ycoord],
        [0, ycoord],
    ]

    d3.selectAll("g#pred").remove();

    const svg = d3.select("#graph > svg > g");

    let line = d3.line()
        .x((d) => x(d[0]))
        .y((d) => y(d[1]));

    svg
        .append("g")
        .attr("id", "pred")
        .append("path")
        .attr("d", line(coords))
        .attr("fill", "none")
        .style("stroke", "purple")
        .style("stroke-width", "2px");

}

function updateTable(tableId, items) {
    clearEntries();

    let keyOrder = ["Merkki", "Malli", "Vuosimalli", "Mittarilukema", "Kw", "Verotusarvo", "Veroprosentti"];

    let table = document.getElementById(tableId);
    let tbody = table.getElementsByTagName("tbody")[0];

    // add new entries
    for (index in items) {
        let row = tbody.insertRow();
        row.setAttribute("id", "row-" + items[index].index);
        keyOrder.forEach(key => {
            let value = items[index][key]

            if (key == "Mittarilukema" || key == "Verotusarvo" || key == "Veroprosentti") {
                value = Math.round(parseFloat(value));
            }

            let cell = row.insertCell();
            let text = document.createTextNode(value);
            cell.appendChild(text);
        });

        row.addEventListener("mouseenter", function (mouseEvent) {
            let id = mouseEvent.target.id;
            let entryId = id.slice(id.indexOf("-") + 1);

            let rows = document.getElementsByClassName("highlighted");
            while (rows.length) {
                rows[0].classList.remove("highlighted");
            }

            let row = document.getElementById("row-" + entryId);
            row.classList.add("highlighted");

            d3.select(`#dot-${entryId}`)
                .style("fill", "Orange")
                .attr("r", 6);
        });

        row.addEventListener("mouseleave", function (mouseEvent) {
            let id = mouseEvent.target.id;
            let entryId = id.slice(id.indexOf("-") + 1);
            d3.select(`#dot-${entryId}`)
                .style("fill", function (d, i) {
                    return colors(d.Weight);
                })
                .attr("r", 3);
        });
    };

    //sorttable.makeSortable(table);
}

async function updateGraph(entries, maxX, maxY) {
    // remove any previous graphs
    d3.selectAll("#graph > *").remove();

    // Append SVG Object to the Page
    const svg = d3.select("#graph")
        .append("svg")
        .append("g")
        .attr("transform", `translate(${margin}, ${margin})`);

    // X Axis
    x = d3.scaleLinear()
        .domain([0, maxX])
        .range([0, xMax]);

    svg.append("g")
        .attr("transform", `translate(0,${yMax})`)
        .call(d3.axisBottom(x));

    // Y Axis
    y = d3.scaleLinear()
        .domain([0, maxY * 1.1])
        .range([yMax, 0]);

    svg.append("g")
        .call(d3.axisLeft(y));

    svg.append('g')
        .selectAll("dot")
        .data(entries).enter()
        .append("circle")
        .attr("id", function (d) {
            return "dot-" + d.index;
        })
        .attr("cx", function (d) {
            return x(d.Mittarilukema);
        })
        .attr("cy", function (d) {
            return y(d.Verotusarvo);
        })
        .attr("r", 3)
        .style("fill", function (d, i) {
            return colors(d.Weight);
        })
        .on("mouseover", function (d) {
            d3.select(this)
                .style("fill", "Orange")
                .attr("r", 6);
            let id = d3.select(this).attr('id');
            let entryId = id.slice(id.indexOf("-") + 1);

            let rows = document.getElementsByClassName("highlighted");
            while (rows.length) {
                rows[0].classList.remove("highlighted");
            }

            let row = document.getElementById("row-" + entryId);
            row.classList.add("highlighted");
        }).on("mouseout", function (d) {
            d3.select(this)
                .style("fill", function (d, i) {
                    return colors(d.Weight);
                })
                .attr("r", 3);
        });
}
