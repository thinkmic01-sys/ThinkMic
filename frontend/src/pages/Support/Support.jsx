import React, { useState } from 'react';

const helpCategories = [
    { icon: 'rocket_launch', title: 'Getting Started', desc: 'Learn the basics of setting up your account.' },
    { icon: 'mic', title: 'Using the Mic', desc: 'Detailed guides on hardware setup and integration.' },
    { icon: 'psychology', title: 'AI Research', desc: 'Explore methodologies for utilizing AI analysis.' },
    { icon: 'credit_card', title: 'Billing', desc: 'Manage your subscription and view invoices.' },
    { icon: 'integration_instructions', title: 'API & Integrations', desc: 'Developer documentation for connections.' },
    { icon: 'list_alt', title: 'Learning List', desc: 'Curated tutorials to master advanced workflows.' },
];

const faqs = [
    { question: 'How do I calibrate the AI sentiment analysis?', answer: 'To calibrate the sentiment analysis engine for specific domains, navigate to Settings > AI Processing > Model Calibration. We recommend uploading at least 5 baseline audio samples.' },
    { question: 'Where can I find my invoice history?', answer: 'You can find your full invoice history by going to Settings > Billing and scrolling down to the "Invoices" section.' },
    { question: 'What is the difference between standard and high-fidelity transcription?', answer: 'High-fidelity transcription uses a larger AI model that processes audio slower but achieves higher accuracy, especially for complex technical jargon.' },
    { question: 'How do I export my research data to CSV?', answer: 'Navigate to the Analytics or Submissions page, apply your desired filters, and click the "Export CSV" button in the top right corner of the data table.' },
];

export default function Support() {
    const [activeFaq, setActiveFaq] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');

    // FRONTEND LOGIC: Filter the FAQs based on the search bar input
    const filteredFaqs = faqs.filter(faq =>
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="w-full h-[calc(100vh-64px)] overflow-y-auto bg-[#f9f9ff] font-sans custom-scrollbar">
            <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 flex flex-col pb-20">

            {/* Hero Section */}
            <div className="text-center py-8 sm:py-12 flex flex-col items-center px-2 sm:px-0">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 leading-tight tracking-tight">How can we help you today?</h1>
                <p className="text-gray-500 text-base sm:text-lg mb-8 sm:mb-10">Search our knowledge base or browse categories below.</p>

                <div className="relative w-full max-w-2xl group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[20px] sm:text-[24px] group-focus-within:text-primary transition-colors">search</span>
                    <input
                        type="text"
                        placeholder="e.g., 'Configure mic' or 'export'"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-12 sm:h-14 pl-12 pr-4 rounded-xl border border-gray-200 bg-white text-gray-900 shadow-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow text-base sm:text-lg placeholder:text-[14px] sm:placeholder:text-[16px]"
                    />
                </div>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-16">
                {helpCategories.map((cat, idx) => (
                    <div key={idx} className="bg-white p-5 sm:p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group flex flex-col sm:block items-center text-center sm:text-left">
                        <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-primary/10 transition-colors shrink-0">
                            <span className="material-symbols-outlined text-primary">{cat.icon}</span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">{cat.title}</h3>
                        <p className="text-[13px] sm:text-sm text-gray-500 leading-relaxed">{cat.desc}</p>
                    </div>
                ))}
            </div>

            {/* Bottom Split Layout */}
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

                {/* Left Side: Support Chat Card */}
                <div className="w-full lg:w-1/3 flex flex-col gap-4 sm:gap-6 order-2 lg:order-1">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">Still need help?</h2>
                    <div className="bg-white p-5 sm:p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4 relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan"></div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary flex items-center justify-center text-white shrink-0">
                                <span className="material-symbols-outlined text-[20px] sm:text-[24px]">forum</span>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 leading-tight text-[14px] sm:text-[16px]">Chat with Support</h4>
                                <span className="text-[11px] sm:text-xs font-mono font-bold text-cyan flex items-center gap-1 mt-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse"></span> Online now
                                </span>
                            </div>
                        </div>
                        <button 
                            onClick={() => window.dispatchEvent(new Event('open-support'))}
                            className="w-full py-2.5 sm:py-2 bg-primary text-white rounded-lg text-[13px] sm:text-sm font-bold mt-2 hover:bg-opacity-90 transition-colors"
                        >
                            Start Chat
                        </button>
                    </div>
                </div>

                {/* Right Side: FAQs */}
                <div className="w-full lg:w-2/3 flex flex-col order-1 lg:order-2">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Frequently Asked Questions</h2>
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

                        {filteredFaqs.length > 0 ? (
                            filteredFaqs.map((faq, index) => {
                                const isOpen = activeFaq === index;
                                return (
                                    <div key={index} className="border-b border-gray-100 last:border-0">
                                        <button
                                            onClick={() => setActiveFaq(isOpen ? null : index)}
                                            className="w-full px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                                        >
                                            <span className="font-bold text-gray-900 text-[13px] sm:text-sm pr-4">{faq.question}</span>
                                            <span className={`material-symbols-outlined text-gray-400 text-[20px] sm:text-[24px] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                                        </button>
                                        {isOpen && (
                                            <div className="px-4 sm:px-6 pb-4 sm:pb-6 text-[13px] sm:text-sm text-gray-600 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                                                {faq.answer}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="px-6 py-8 text-center text-gray-500 text-[13px] sm:text-sm font-bold">No FAQs found matching "{searchQuery}"</div>
                        )}

                    </div>
                </div>
            </div>
            </div>
        </div>
    );
}