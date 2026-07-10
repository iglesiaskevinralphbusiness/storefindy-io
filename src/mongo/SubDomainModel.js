import mongoose from 'mongoose';


const subDomainSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    name: { type: String, required: true },
    locator_id: { type: String, required: true },
    
    meta_title: { type: String, default: '' },
    meta_description: { type: String, default: '' },
    custom_css: { type: String, default: '' },
    custom_js: { type: String, default: '' },
    custom_html_footer: { type: String, default: '' },
    custom_html_header: { type: String, default: '' },
}, { timestamps: true },);

let SubDomainModel;
try {
  SubDomainModel = mongoose.model('SubDomainModel');
} catch {
  SubDomainModel = mongoose.model('SubDomainModel', subDomainSchema);
}

export { SubDomainModel };
