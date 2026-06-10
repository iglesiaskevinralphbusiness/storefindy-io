'use client';
import { LuFilter, LuMapPin, LuPhone, LuClock } from "react-icons/lu";
import { HiMiniMagnifyingGlass } from "react-icons/hi2";
import { FaAngleDown } from "react-icons/fa6";
import { formStyles, resultsStyles, mapStyles, userDefinedStyles } from './styles';
import Link from 'next/link';
import { useState } from 'react';

export default function Locator({ data }) {
    const [locations, setLocations] = useState([
        {
            id: 1,
            name: 'Store Brooklyn NY',
            address: '123 Main St, Brooklyn, NY 11201',
            phone: '123-456-7890',
            hours: '10:00 AM - 6:00 PM',
        },
        {
            id: 2,
            name: 'Store Brooklyn NY',
            address: '123 Main St, Brooklyn, NY 11201',
            phone: '123-456-7890',
            hours: '10:00 AM - 6:00 PM',
        },
        {
            id: 3,
            name: 'Store Brooklyn NY',
            address: '123 Main St, Brooklyn, NY 11201',
            phone: '123-456-7890',
            hours: '10:00 AM - 6:00 PM',
        }
    ]);

    const [openHours, setOpenHours] = useState({});

    const toggleHours = (id) => {
        setOpenHours((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <>
            <style>{locatorStyles}</style>
            <div className={`locator large-app`}>
                <div className="locator-sidebar">
                    <form>
                        <div className="inputs">
                            <input type="text" placeholder="Enter city, state, or postal code" className="input-search" />
                            <button type="submit" className="btn-search"><HiMiniMagnifyingGlass />Search</button>
                            <button type="button" className="btn-filter"><LuFilter /> Filter</button>
                        </div>
                    </form>
                    <div className="results">
                        {/* <p className="results-error">No locations were found using your search criteria [ bayambang ]. Please try another input address to search for locations.</p> */}
                        <p className="results-count" role="alert" aria-atomic="true"><LuMapPin /> 2 locations found near you</p>
                        
                        <ul className="results-list">
                            {
                                locations.map((location) => (
                                    <li key={location.id}>
                                        <div className="title">
                                            <h2>
                                                <span>1</span>
                                                <span>Store Brooklyn NY</span>
                                            </h2>
                                            <p>6.6 mi</p>
                                        </div>
                                        <div className="details">
                                            <p className="address"><LuMapPin /> 123 Main St, Brooklyn, NY 11201</p>
                                            <Link href="tel:1234567890"  className="phone"><LuPhone /> 123-456-7890</Link>
                                            <div className="todays-hours">
                                                <p><LuClock /> Today's Hours:</p>
                                                <p>Closed</p>
                                            </div>
                                            <button
                                                type="button"
                                                className={`btn-store-hours${openHours[location.id] ? ' open' : ''}`}
                                                onClick={() => toggleHours(location.id)}
                                                aria-expanded={!!openHours[location.id]}
                                            >
                                                <LuClock /> Store Hours <FaAngleDown />
                                            </button>
                                            <ul className={`store-hours${openHours[location.id] ? ' open' : ''}`}>
                                                <li><span>Monday</span><span>10:00 AM - 6:00 PM</span></li>
                                                <li><span>Tuesday</span><span>10:00 AM - 6:00 PM</span></li>
                                                <li><span>Wednesday</span><span>10:00 AM - 6:00 PM</span></li>
                                                <li><span>Thursday</span><span>10:00 AM - 6:00 PM</span></li>
                                                <li><span>Friday</span><span>10:00 AM - 6:00 PM</span></li>
                                                <li><span>Saturday</span><span>10:00 AM - 6:00 PM</span></li>
                                                <li><span>Sunday</span><span>CLosed</span></li>
                                            </ul>
                                        </div>
                                        <div className="actions">
                                            <Link href="https://www.google.com/maps/dir/?api=1&destination=123 Main St, Brooklyn, NY 11201">Get Directions</Link>
                                            <Link href="/">View Store Page</Link>
                                        </div>
                                    </li>
                                ))
                            }

                        </ul>
                    </div>
                </div>
                <div className="locator-map">

                </div>
            </div>
        </>
    );
}


export const locatorStyles = `
.locator {
    display: flex;
    flex-direction: row;
    flex: 1;
    height: 700px;
    width: 100%;
    font-size: 14px;
    overflow: hidden;
}
.locator-sidebar {
    display: flex;
    flex-direction: column;
    max-width: 470px;
    width: 470px;
    padding: 24px;
    box-sizing: border-box;
}
${formStyles}
${resultsStyles}
${mapStyles}
${userDefinedStyles}
`;