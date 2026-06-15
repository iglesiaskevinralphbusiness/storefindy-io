export const formStyles = `
.locator-sidebar .inputs {
    display: flex;
    flex-direction: row;
    gap: 10px;
}
.locator-sidebar .inputs .search-suggest {
    position: relative;
    flex: 1;
}
.locator-sidebar .inputs .input-search {
    flext: 1;
    width: 100%;
    height: 40px;
    padding: 0 15px;
    border: 1px solid #000;
    font-size: 100%;
    outline: none;
    box-sizing: border-box;
}
.locator-sidebar .inputs .search-suggest-list {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 1000;
    margin: 0;
    padding: 4px 0;
    list-style: none;
    background-color: #fff;
    border: 1px solid #ddd;
    border-radius: 6px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
    max-height: 260px;
    overflow-y: auto;
}
.locator-sidebar .inputs .search-suggest-list li {
    padding: 9px 15px;
    font-size: 100%;
    color: #222;
    cursor: pointer;
}
.locator-sidebar .inputs .search-suggest-list li.active,
.locator-sidebar .inputs .search-suggest-list li:hover {
    background-color: #f2f4f7;
}
.locator-sidebar .inputs .search-suggest-match {
    background: transparent;
    font-weight: 700;
    color: inherit;
}
.locator-sidebar .inputs .btn-search {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    height: 40px;
    padding: 0 15px;
    background-color: #000;
    color: #fff;
    cursor: pointer;
}
.locator-sidebar .inputs .btn-filter {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    height: 40px;
    padding: 0 15px;
    background-color: #000;
    color: #fff;
    cursor: pointer;
}
.locator-sidebar .other-inputs {
    display: flex;
    flex-direction: row;
    gap: 10px;
}
.locator-sidebar .other-inputs .country-control {
    max-width: 265px;
    flext: 1;
}
.locator-sidebar .other-inputs .radius-control {
    max-width: 147px;
    flex: 1;
}
`;

export const resultsStyles = `
.results {
    display: flex;
    flex-direction: column;
    flex: 1;
    gap: 15px;
    margin-top: 15px;
}
.results .results-error,
.results .results-count {
    display: block;
}
.results .results-count svg {
    display: inline;
    margin-top: -2px;
}
.results ul.results-list {
    height: calc(100% - 315px);
    overflow-y: auto;
}
.results ul.results-list > li {
    margin-bottom: 15px;
    padding: 16px 13px;
    border: 1px solid #e7e9e9;
    border-left-width: 4px;
}
.results ul.results-list > li .title {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 15px;
}
.results ul.results-list > li .title h2 {
    margin: 0;
    font-size: 120%;
    font-weight: bold;
}
.results ul.results-list > li .title span {
    padding-right: 10px;
}
.results ul.results-list > li .title p {
    font-size: 90%;
}
.results ul.results-list > li .details {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 20px;
    padding-left: 18px;
}
.results ul.results-list > li .details .address,
.results ul.results-list > li .details .phone,
.results ul.results-list > li .details .website,
.results ul.results-list > li .details .todays-hours p {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 100%;
}
.results ul.results-list > li .details .todays-hours {
    display: flex;
    align-items: center;
    justify-content: space-between;
}
.results ul.results-list > li .details .btn-store-hours {
    display: flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
}
.results ul.results-list > li .details .btn-store-hours svg:last-child {
    font-size: 70%;
    transition: transform 0.2s ease;
}
.results ul.results-list > li .details .btn-store-hours.open svg:last-child {
    transform: rotate(180deg);
}
.results ul.results-list > li .details .store-hours {
    width: 100%;
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    transition: max-height 0.3s ease, opacity 0.3s ease, margin 0.3s ease;
}
.results ul.results-list > li .details .store-hours.open {
    max-height: 500px;
    opacity: 1;
}
.results ul.results-list > li .details .store-hours li {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
    font-size: 100%;
}
.results ul.results-list > li .details .store-hours li:last-child {
    margin-bottom: 0;
}
.results ul.results-list > li .actions {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    font-size: 100%;
}
.results ul.results-list > li .actions a {
    flex: 1;
    max-width: calc(50% - 5px);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    height: 40px;
    padding: 0 15px;
    background-color: #000;
    color: #fff;
    cursor: pointer;
}
.locator-sidebar .filter-panel {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
    padding: 12px;
    border: 1px solid #e7e9e9;
    border-radius: 6px;
}
.locator-sidebar .filter-panel .filter-option {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    font-size: 95%;
}
.locator-sidebar .filter-panel .filter-empty {
    font-size: 90%;
    color: #777;
    opacity: 0.6;
}
.locator-sidebar .radius-control,
.locator-sidebar .country-control {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
    font-size: 95%;
}
.locator-sidebar .radius-control select,
.locator-sidebar .country-control select {
    flex: 1;
    height: 40px;
    padding: 0 15px;
    border: 1px solid #d4d4d4;
    border-radius: 4px;
    font-size: 100%;
    outline: none;
}
.locator-sidebar .country-control select {
    flex: 1;
    min-width: 0;
}
`;

export const mapStyles = `
.locator-map {
    flex: 1;
    position: relative;
}
.locator-map .map-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #777;
}
.results ul.results-list > li.active {
    border-left-color: #185FA5;
}
.powered-by {
    position: absolute;
    bottom: 0;
    right: 0;
    z-index: 99999;
    font-size: 9px;
    text-align: right;
    a {
        color: #2563eb;
        text-decoration: none;
    }
}

/* Map pin popup — mirrors the result <li> layout so the bubble shows the same
   UI and information as the list item. */
.leaflet-popup-content {
    margin: 14px 16px;
}
.locator-popup-card .title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-bottom: 15px;
}
.locator-popup-card .title h2 {
    margin: 0;
    font-size: 120%;
    font-weight: bold;
}
.locator-popup-card .title span {
    padding-right: 10px;
}
.locator-popup-card .title p {
    font-size: 90%;
    margin: 0;
}
.locator-popup-card .details {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 20px;
    padding-left: 18px;
}
.locator-popup-card .details .address,
.locator-popup-card .details .phone,
.locator-popup-card .details .website,
.locator-popup-card .details .todays-hours p {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 100%;
    margin: 0;
}
.filters-checked span {
    background-color: #e7e9e9;
    font-size: 75%;
    margin-right: 5px;
    padding: 3px 7px;
    border-radius: 7px;
    color: #000;
}
.note {
    font-size: 90%;
    opacity: 0.7;
}
.social-media-links {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
}
.social-media-links a {
    display: inline-flex;
    align-items: center;
    font-size: 130%;
    line-height: 1;
    transition: opacity 0.15s ease;
}
.social-media-links a:hover {
    opacity: 0.7;
}
.locator-popup-card .details .todays-hours {
    display: flex;
    align-items: center;
    justify-content: space-between;
}
.locator-popup-card .details .btn-store-hours {
    display: flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
}
.locator-popup-card .details .btn-store-hours svg:last-child {
    font-size: 70%;
    transition: transform 0.2s ease;
}
.locator-popup-card .details .btn-store-hours.open svg:last-child {
    transform: rotate(180deg);
}
.locator-popup-card .details .store-hours {
    width: 100%;
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    list-style: none;
    padding: 0;
    margin: 0;
    transition: max-height 0.3s ease, opacity 0.3s ease, margin 0.3s ease;
}
.locator-popup-card .details .store-hours.open {
    max-height: 500px;
    opacity: 1;
}
.locator-popup-card .details .store-hours li {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
    font-size: 100%;
}
.locator-popup-card .details .store-hours li:last-child {
    margin-bottom: 0;
}
.locator-popup-card .actions {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    font-size: 100%;
}
.locator-popup-card .actions a {
    flex: 1;
    max-width: calc(50% - 5px);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    height: 40px;
    padding: 0 15px;
    background-color: #000;
    color: #fff;
    text-decoration: none;
    cursor: pointer;
}
`;



export const userDefinedStyles = `
.small-app {
    height: 500px;
}
.small-app .results ul.results-list {
    height: 390px;
}
.small-app.form2columns .results ul.results-list {
    height: 338px;
}

.medium-app {
    height: 665px;
}
.medium-app .results ul.results-list {
    height: 553px;
}
.medium-app .results ul.results-list {
    height: 553px;
}
.medium-app.form2columns .results ul.results-list {
    height: 501px;
}
    
.large-app {
    height: 765px;
}
.large-app .results ul.results-list {
    height: 657px;
}
.large-app.form2columns .results ul.results-list {
    height: 605px;
}
`;