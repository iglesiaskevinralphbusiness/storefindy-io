export const formStyles = `
.locator-sidebar .inputs {
    display: flex;
    flex-direction: row;
    gap: 10px;
}
.locator-sidebar .inputs .input-search {
    flext: 1;
    width: 100%;
    height: 40px;
    padding: 0 15px;
    border: 1px solid #000;
    font-size: 14px;
    outline: none;
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
`;

export const mapStyles = `
.locator-map {
    flex: 1;
}
`;



export const userDefinedStyles = `
.small-app {
    height: 500px;
}
.small-app .results ul.results-list {
    height: 390px;
}
.medium-app {
    height: 665px;
}
.medium-app .results ul.results-list {
    height: 553px;
}
.large-app {
    height: 765px;
}
.large-app .results ul.results-list {
    height: 657px;
}
`;