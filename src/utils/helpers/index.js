export function serializeForClient(data) {
    return JSON.parse(JSON.stringify(data));
}

export function mongooseFormatTimeAgo(created, edited) {
    let label = "Edited";
    if(created === edited){ label = "Created"; }
    
    const seconds = Math.floor((new Date() - new Date(edited)) / 1000);
  
    if (seconds < 60)       return `${label} just now`;
    if (seconds < 3600)     return `${label} ${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 7200)     return `${label} 1 hour ago`;
    if (seconds < 86400)    return `${label} ${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 172800)   return "${label} yesterday";
    if (seconds < 2592000)  return `${label} ${Math.floor(seconds / 86400)} days ago`;
    if (seconds < 31536000) return `${label} ${Math.floor(seconds / 2592000)} months ago`;
  
    return `Edited ${Math.floor(seconds / 31536000)} years ago`;
}

export function generateSettingsDefault(settings) {
    return {
        height: settings.height,
        background: settings.background,
        text_color: settings.text_color,
        font_family: settings.font_family,
        font_size: settings.font_size,
        border: settings.border,
        border_color: settings.border_color,
        searchInput: {
            border: settings.searchInput.border,
            background: settings.searchInput.background,
            text_color: settings.searchInput.text_color,
            border_color: settings.searchInput.border_color,
            placeholder: settings.searchInput.placeholder,
        },
        search: {
            border: settings.search.border,
            background: settings.search.background,
            label: settings.search.label,
            text_color: settings.search.text_color,
            icon: settings.search.icon,
        },
        filter: {
            border: settings.filter.border,
            background: settings.filter.background,
            label: settings.filter.label,
            text_color: settings.filter.text_color,
            icon: settings.filter.icon,
        },
        filterList: {
            border_color: settings.filterList.border_color,
            background: settings.filterList.background,
            text_color: settings.filterList.text_color,
            active_background: settings.filterList.active_background,
            active_text_color: settings.filterList.active_text_color,
        },
        resultItem: {
            active_border_color: settings.resultItem.active_border_color,
            active_background: settings.resultItem.active_background,
            border: settings.resultItem.border,
            border_color: settings.resultItem.border_color,
            background: settings.resultItem.background,
        },
        getDirections: {
            border: settings.getDirections.border,
            background: settings.getDirections.background,
            label: settings.getDirections.label,
            text_color: settings.getDirections.text_color,
            icon: settings.getDirections.icon,
        },
        viewLocation: {
            border: settings.viewLocation.border,
            background: settings.viewLocation.background,
            label: settings.viewLocation.label,
            text_color: settings.viewLocation.text_color,
            icon: settings.viewLocation.icon,
        },
        pin: {
            type: settings.pin.type,
            color: settings.pin.color,
            size: settings.pin.size,
            text_color: settings.pin.text_color,
            text_size: settings.pin.text_size,
            image: settings.pin.image,
        },
        mobileView: {
            background: settings.mobileView.background,
            text_color: settings.mobileView.text_color,
            active_border_color: settings.mobileView.active_border_color,
            active_background: settings.mobileView.active_background,
        }
    }
}

export function generateFeaturesDefault(data) {
    return {
        //
        show_map_radius_indicator: data.show_map_radius_indicator,
        show_map_pin_number: data.show_map_pin_number,
        form_style: data.form_style,
        focused_zoom: data.focused_zoom,

        //
        show_search_bar: data.show_search_bar,
        detect_location: data.detect_location,
        show_filters: data.show_filters,
        show_radius: data.show_radius,
        show_store_list: data.show_store_list,
        show_directions: data.show_directions,
        show_store_hours: data.show_store_hours,
    }
}

// `tzOffsetMinutes` is the visitor's `Date.getTimezoneOffset()` (from the
// browser), where local = UTC - offset. When provided we derive the hour in
// the visitor's timezone instead of the server's, so analytics buckets reflect
// the user's PC time. Falls back to server local time when it is missing.
export function getCurrentHourCode(tzOffsetMinutes = null) {
    const now = new Date();

    let hour; // 0-23
    if (tzOffsetMinutes !== null && Number.isFinite(tzOffsetMinutes)) {
        const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
        const localMinutes = (((utcMinutes - tzOffsetMinutes) % 1440) + 1440) % 1440;
        hour = Math.floor(localMinutes / 60);
    } else {
        hour = now.getHours();
    }

    const suffix = hour < 12 ? "a" : "p";
    const displayHour = hour % 12 || 12; // Convert 0 -> 12

    return `${displayHour}${suffix}`;
}