'use client';
import styles from '../../../Dashboard.module.scss';
import { useRouter } from 'next/navigation';
import { useState, useActionState, useEffect } from 'react';
import { postCreateLocator, postEditLocator } from '@/actions/locator';
import Sidebar from '@/components/Dashboard/Sidebar';
import { RiArrowRightLine } from "react-icons/ri";
import { LuInfo, LuCheck, LuChevronLeft, LuPlus, LuPencil, LuTrash2, LuX } from "react-icons/lu";
import Input from '@/components/Forms/Input';
import Textarea from '@/components/Forms/Textarea';
import Select from '@/components/Forms/Select';
import Checkbox from '@/components/Forms/Checkbox';
import Button from '@/components/Forms/Button';
import { toast } from 'react-toastify';

export default function SubdomainsCreatePageClient({ locators=[], data=null }) {
    const router = useRouter();

    const [locatorId, setLocatorId] = useState(data?.locator_id || '');
    const [name, setName] = useState(data?.name || '');
    const [metaTitle, setMetaTitle] = useState(data?.meta_title || '');
    const [metaDescription, setMetaDescription] = useState(data?.meta_description || '');
    const [header, setHeader] = useState(data?.header || '');
    const [footer, setFooter] = useState(data?.footer || '');
    const [customCss, setCustomCss] = useState(data?.custom_css || '');
    const [customJs, setCustomJs] = useState(data?.custom_js || '');

    const [filters, setFilters] = useState(data?.filters || []);

    // form submit handler
    const postCreateLocatorWithParams = data ? postEditLocator.bind(null, data._id, filters) : postCreateLocator.bind(null, filters);
    const [state, action, pending] = useActionState(postCreateLocatorWithParams, { status: "idle" });
    const err = (field) => state.status === "error" ? state.errors[field] : undefined;
    useEffect(() => {
        if (state.status === "idle") return;
        if (state.status === "success") {
            toast.success(data ? "Locator updated successfully" : "Locator created successfully", { description: state.message });
            router.push('/dashboard/locators');
        } else if (state.status === "error") {
            toast.warning("Some fields are not valid", { description: Object.values(state.errors)[0] });
        } else if (state.status === "fatal") {
            toast.error("Something went wrong", { description: state.message });
        }
    }, [state]);

    return (
        <div className={styles.dashboard}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.title}>
                    <h1>Create Sub Domain</h1>
                    <p>Dashboard <RiArrowRightLine /> My Locators <RiArrowRightLine /> Custom Sub Domains <RiArrowRightLine /> Create Sub Domain</p>
                </div>
                <div className={styles.body}>
                    <form action={action} className={styles.create}>

                        <div className={styles.block}>
                            <h2><LuInfo /> Sub Domain Assignment</h2>

                            <div className={`${styles.subDomainInput} ${err("name") ? styles.errorForm : ''}`}>
                                <label htmlFor='name'>Subdomain Name <span className={styles.required}>*</span></label>
                                <div className={styles.inputBox}>
                                    <input
                                        type="text"
                                        name="name"
                                        value={name}
                                        maxLength={30}
                                        min={3}
                                        max={30}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="yourbusinessname"
                                        required={true}
                                    />
                                    <span>.storefindy.com</span>
                                    <Button
                                        type="button"
                                        value="Check"
                                        primary={false}
                                    />
                                </div>
                                <p className={styles.note}>
                                    Only lowercase letters, numbers, and hyphens. 3–30 characters. e.g. <span>mybrand</span> or <span>my-pharmacy</span>
                                </p>
                                { err("name") ? <p className={styles.error}>{err("name")}</p> : '' }
                            </div>

                            <Select
                                label="Assigne to Locator"
                                name="locator_id"
                                value={locatorId}
                                onChange={e => setLocatorId(e.target.value)}
                                options={locators.map(locator => ({
                                    label: locator.name,
                                    code: locator._id,
                                }))}
                                required={true}
                                note="The selected locator will be displayed when anyone visits your subdomain URL."
                                error={err("locator_id")}
                            />
                        </div>

                        <div className={styles.block}>
                            <h2>SEO Settings</h2>   
                            <Input
                                label="Page Title"
                                name="meta_title"
                                value={metaTitle}
                                onChange={e => setMetaTitle(e.target.value)}
                                placeholder="Enter the title of this page. e.g. My Business | Locator Name"
                            />
                            <Textarea
                                label="Page Description"
                                name="meta_description"
                                value={metaDescription}
                                onChange={e => setMetaDescription(e.target.value)}
                                placeholder="Enter a brief description of this page. This may be used as the meta description for search engines and social sharing."
                            />
                        </div>

                        <div className={styles.block}>
                            <h2>Header & Footer</h2>
                            <Textarea
                                label="Header HTML"
                                name="header"
                                value={header}
                                onChange={e => setHeader(e.target.value)}
                                placeholder="Enter your header HTML code here..."
                            />
                            <Textarea
                                label="Footer HTML"
                                name="footer"
                                value={footer}
                                onChange={e => setFooter(e.target.value)}
                                placeholder="Enter your footer HTML code here..."
                            />
                            <Textarea
                                label="Custom CSS"
                                name="custom_css"
                                value={customCss}
                                onChange={e => setCustomCss(e.target.value)}
                                placeholder="Enter your custom CSS code here..."
                            />
                            <Textarea
                                label="Custom JS"
                                name="custom_js"
                                value={customJs}
                                onChange={e => setCustomJs(e.target.value)}
                                placeholder="Enter your custom JS code here..."
                            />
                        </div>


                        <div className={styles.buttons}>
                            <Button
                                onClick={() => router.back()}
                                value="Back"
                                icon={<LuChevronLeft />}
                            >Back</Button>
                            <Button
                                type="submit"
                                name={data ? "update_locator" : "create_domain"}
                                value={data ? "Update Locator" : "Create Subdomain"}
                                required={true}
                                icon={<LuCheck />}
                                iconPosition='right'
                                primary={true}
                                disabled={name.trim() === '' ? true : false}
                                pending={pending}
                            />
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}