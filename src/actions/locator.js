"use server";
import { dbConnect } from '@/config/mongo.config';
import { LocatorModel } from '@/mongo/LocatorModel';

export async function postCreateLocator(filters,_prev, formData) {
    dbConnect();
    
    const form = {
        name: formData.get('locator_name').trim(),
        description: formData.get('locator_description'),
        default_language: formData.get('default_language'),
        default_country: formData.get('default_country'),
        default_zoom_level: formData.get('default_zoom_level'),
        search_radius: formData.get('search_radius'),
        maximum_results_shown: formData.get('maximum_results_shown'),
        filters: filters,
        show_search_bar: formData.get('show_search_box') === 'on' ? true : false,
        detect_location: formData.get('detect_location') === 'on' ? true : false,
        show_filters: formData.get('show_filters') === 'on' ? true : false,
        show_radius: formData.get('show_radius') === 'on' ? true : false,
        show_store_list: formData.get('show_store_list') === 'on' ? true : false,
        show_directions: formData.get('show_directions') === 'on' ? true : false,
        show_store_hours: formData.get('show_store_hours') === 'on' ? true : false,
        show_phone_number: formData.get('show_phone_number') === 'on' ? true : false,
        show_website_link: formData.get('show_website_link') === 'on' ? true : false,
        powered_by_storefindy: formData.get('powered_by_storefindy') === 'on' ? true : false,
    }

    // manual validation
    const errors = {};
    if(form.locator_name === '') {
        errors.locator_name = 'Locator name is required';
    }
    // if any errors, return early
    if (Object.keys(errors).length > 0) {
        return { status: "error", errors };
    }

    // save
    try {
        await LocatorModel.create(form);
        return { status: "success", message: 'Locator created successfully' };
    } catch (error) {
        console.log(error)
        return { status: "fatal", message: "Server error. Please try again." };
    }
}