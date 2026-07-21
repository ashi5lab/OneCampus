import { useState, useRef } from 'react';
import { LoginPage } from '../../auth/components/LoginPage';
import { FiUsers, FiCheckCircle, FiCreditCard, FiBookOpen, FiMessageSquare, FiGlobe, FiShield, FiSmartphone, FiAward, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { apiClient } from '../../../lib/apiClient';

export function LandingPage() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [contactStatus, setContactStatus] = useState({ loading: false, success: false, error: null });
  const scrollContainerRef = useRef(null);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 350; // amount to scroll per click
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactStatus({ loading: true, success: false, error: null });
    const formData = new FormData(e.target);
    const payload = {
      type: 'contact',
      name: formData.get('name'),
      email: formData.get('email'),
      message: formData.get('message')
    };

    try {
      await apiClient.post('/platform/inquiries', payload);
      setContactStatus({ loading: false, success: true, error: null });
      e.target.reset();
    } catch (err) {
      setContactStatus({ loading: false, success: false, error: err.message });
    }
  };

  return (
    <div className="font-body bg-[#f8fafc] text-ink-900 min-h-screen">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="font-extrabold text-2xl text-microsoft-blue tracking-tight">OneCampus</div>
          <div className="hidden md:flex space-x-6 text-[13px] font-semibold text-ink-700">
            <a href="#features" className="hover:text-microsoft-blue transition-colors">Features</a>
            <a href="#about" className="hover:text-microsoft-blue transition-colors">About</a>
            <a href="#privacy" className="hover:text-microsoft-blue transition-colors">Privacy</a>
            <a href="#terms" className="hover:text-microsoft-blue transition-colors">Terms</a>
            <a href="#contact" className="hover:text-microsoft-blue transition-colors">Contact</a>
          </div>
          <button 
            onClick={() => setIsLoginModalOpen(true)}
            className="bg-microsoft-blue text-white px-5 py-2 text-sm font-semibold hover:bg-microsoft-hover transition-colors"
          >
            Customer Login
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-5xl font-extrabold leading-tight text-ink-900">
              Complete School Management Platform
            </h1>
            <p className="mt-6 text-lg text-ink-500">
              OneCampus helps schools manage admissions, students, teachers, attendance,
              fees, communication, examinations and administration from a single cloud platform.
            </p>
            <div className="mt-8 flex gap-4">
              <button 
                onClick={() => setIsDemoModalOpen(true)}
                className="bg-microsoft-blue text-white px-6 py-3 text-sm font-semibold hover:bg-microsoft-hover transition-colors shadow-sm"
              >
                Request Demo
              </button>
              <button 
                onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                className="border border-microsoft-blue text-microsoft-blue px-6 py-3 text-sm font-semibold hover:bg-blue-50 transition-colors shadow-sm"
              >
                Contact Us
              </button>
            </div>
          </div>
          <div className="flex justify-center">
            {/* Placeholder graphic styled for Microsoft aesthetic */}
            <div className="w-full max-w-md h-64 bg-gray-50 border border-gray-200 shadow-sm flex flex-col p-4">
              <div className="flex gap-2 mb-4">
                <div className="w-3 h-3 bg-red-500"></div>
                <div className="w-3 h-3 bg-yellow-500"></div>
                <div className="w-3 h-3 bg-green-500"></div>
              </div>
              <div className="flex-1 flex gap-4">
                <div className="w-1/3 bg-gray-200"></div>
                <div className="w-2/3 flex flex-col gap-2">
                  <div className="h-1/4 bg-microsoft-blue bg-opacity-20"></div>
                  <div className="h-3/4 bg-gray-200"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24 relative">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-4xl font-extrabold text-ink-900 tracking-tight">Everything Your School Needs</h2>
          <p className="mt-4 text-lg text-ink-500">A complete suite of tools designed to streamline your educational institution's daily operations.</p>
        </div>
        
        {/* Scroll Buttons */}
        <button 
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 mt-12 md:-ml-4 z-10 p-3 rounded-full bg-white shadow-lg text-ink-900 hover:text-microsoft-blue hover:scale-110 transition-all border border-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
          aria-label="Scroll left"
        >
          <FiChevronLeft className="w-6 h-6" />
        </button>
        <button 
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 mt-12 md:-mr-4 z-10 p-3 rounded-full bg-white shadow-lg text-ink-900 hover:text-microsoft-blue hover:scale-110 transition-all border border-gray-100 focus:outline-none focus:ring-2 focus:ring-microsoft-blue"
          aria-label="Scroll right"
        >
          <FiChevronRight className="w-6 h-6" />
        </button>

        <div 
          ref={scrollContainerRef}
          className="flex overflow-x-auto gap-6 pb-8 pt-4 snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {[
            { icon: FiAward, title: "Student Management", desc: "Admissions, profiles, certificates, promotions" },
            { icon: FiUsers, title: "Teacher Management", desc: "Attendance, leave, profiles, timetable" },
            { icon: FiCheckCircle, title: "Attendance", desc: "Daily attendance and comprehensive reports" },
            { icon: FiCreditCard, title: "Fee Management", desc: "Fees, dues, receipts, history and invoicing" },
            { icon: FiBookOpen, title: "Academics", desc: "Classes, exams, marks, grading and rank lists" },
            { icon: FiMessageSquare, title: "Communication", desc: "WhatsApp, SMS, and Email notifications" },
            { icon: FiGlobe, title: "Website CMS", desc: "News, gallery, events, banners and pages" },
            { icon: FiShield, title: "Security", desc: "Role based access and secure authentication" },
            { icon: FiSmartphone, title: "Platforms", desc: "Web, Android and iOS native app support" }
          ].map((f, i) => (
            <button 
              key={i} 
              onClick={() => document.getElementById('contact').scrollIntoView({ behavior: 'smooth' })}
              className="group min-w-[280px] sm:min-w-[320px] flex-shrink-0 snap-center bg-white p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-transparent hover:border-gray-100 flex flex-col items-center text-center focus:outline-none focus:ring-2 focus:ring-microsoft-blue focus:border-transparent rounded-xl"
            >
              <div className="w-14 h-14 rounded-full bg-blue-50 text-microsoft-blue flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-ink-900 mb-3">{f.title}</h3>
              <p className="text-ink-500 text-sm leading-relaxed">{f.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section className="bg-white border-y border-gray-200 py-20">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12">
          <div id="about">
            <h2 className="text-2xl font-bold mb-4 text-ink-900">About OneCampus</h2>
            <p className="text-ink-700 leading-relaxed text-sm">
              OneCampus is a modern cloud-based School ERP designed to simplify school administration,
              academic management, parent communication, admissions, attendance, examinations,
              fee management and institutional operations through a secure and easy-to-use platform.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-4 text-ink-900">About Webdez Studio</h2>
            <p className="text-ink-700 leading-relaxed text-sm">
              Webdez Studio develops modern web and mobile software solutions with a focus on
              education technology and digital transformation for schools and institutions.
            </p>
          </div>
        </div>
      </section>

      {/* Why OneCampus */}
      <section className="bg-gray-50 py-24 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-4xl font-extrabold text-ink-900 tracking-tight">Why OneCampus?</h2>
            <p className="mt-4 text-lg text-ink-500">Built from the ground up to be the most reliable and easy to use school management system.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div className="group bg-white border border-gray-200 p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 rounded-xl">
              <div className="w-12 h-12 mx-auto bg-blue-50 text-microsoft-blue rounded flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FiGlobe className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-ink-900 mb-2">Cloud Based</h3>
              <p className="text-sm text-ink-500 leading-relaxed">Access from anywhere, anytime without complex installations.</p>
            </div>
            <div className="group bg-white border border-gray-200 p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 rounded-xl">
              <div className="w-12 h-12 mx-auto bg-blue-50 text-microsoft-blue rounded flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FiShield className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-ink-900 mb-2">Secure</h3>
              <p className="text-sm text-ink-500 leading-relaxed">Enterprise-grade security and role-based access control.</p>
            </div>
            <div className="group bg-white border border-gray-200 p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 rounded-xl">
              <div className="w-12 h-12 mx-auto bg-blue-50 text-microsoft-blue rounded flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FiSmartphone className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-ink-900 mb-2">Mobile Friendly</h3>
              <p className="text-sm text-ink-500 leading-relaxed">Works perfectly on desktops, tablets, and mobile phones.</p>
            </div>
            <div className="group bg-white border border-gray-200 p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 rounded-xl">
              <div className="w-12 h-12 mx-auto bg-blue-50 text-microsoft-blue rounded flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FiCheckCircle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-ink-900 mb-2">Fast & Modern</h3>
              <p className="text-sm text-ink-500 leading-relaxed">Built with the latest technologies for lightning fast performance.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="bg-white text-ink-900 py-24 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-start">
          <div>
            <h2 className="text-4xl font-extrabold mb-4 tracking-tight">Get in touch</h2>
            <p className="text-lg text-ink-500 mb-8 leading-relaxed">
              Have questions about OneCampus? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>
          <form onSubmit={handleContactSubmit} className="grid gap-4">
            <input required name="name" className="p-3 bg-gray-50 border border-gray-200 rounded text-ink-900 placeholder-ink-500 text-sm outline-none focus:border-microsoft-blue focus:ring-1 focus:ring-microsoft-blue transition-all" placeholder="Your Name" />
            <input required type="email" name="email" className="p-3 bg-gray-50 border border-gray-200 rounded text-ink-900 placeholder-ink-500 text-sm outline-none focus:border-microsoft-blue focus:ring-1 focus:ring-microsoft-blue transition-all" placeholder="Email" />
            <textarea required name="message" className="p-3 bg-gray-50 border border-gray-200 rounded text-ink-900 placeholder-ink-500 text-sm outline-none focus:border-microsoft-blue focus:ring-1 focus:ring-microsoft-blue transition-all resize-none" rows="5" placeholder="Message"></textarea>
            {contactStatus.error && <div className="text-red-500 text-sm">{contactStatus.error}</div>}
            {contactStatus.success && <div className="text-green-600 text-sm">Thank you! Your message has been sent.</div>}
            <button disabled={contactStatus.loading} className="bg-microsoft-blue text-white font-bold p-3 rounded hover:bg-microsoft-hover transition-colors text-sm mt-2 disabled:opacity-50">
              {contactStatus.loading ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </section>

      {/* Privacy Policy */}
      <section id="privacy" className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold mb-4 text-ink-900">Privacy Policy</h2>
        <ul className="list-disc pl-6 space-y-2 text-ink-700 text-sm">
          <li>We collect only information necessary to provide school management services.</li>
          <li>Personal information is not sold to third parties.</li>
          <li>Data is stored securely using industry-standard practices.</li>
          <li>Schools retain ownership of their data.</li>
          <li>Privacy requests may be sent through our contact page.</li>
        </ul>
      </section>

      {/* Terms & Conditions */}
      <section id="terms" className="max-w-6xl mx-auto px-6 py-16 border-t border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-ink-900">Terms & Conditions</h2>
        <ul className="list-disc pl-6 space-y-2 text-ink-700 text-sm">
          <li>Users agree to use OneCampus lawfully.</li>
          <li>Customers are responsible for safeguarding their accounts.</li>
          <li>Service features may evolve over time.</li>
          <li>Intellectual property belongs to Webdez Studio unless stated otherwise.</li>
          <li>Contact us for legal or contractual queries.</li>
        </ul>
      </section>

      {/* Footer */}
      <footer className="bg-ink-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="font-bold text-xl tracking-tight">OneCampus</div>
          <p className="mt-3 text-sm opacity-80">OneCampus is a product of <strong>Webdez Studio</strong>.</p>
          <p className="mt-1 text-sm opacity-80">© 2026 OneCampus. All rights reserved.</p>
          <div className="mt-6 text-xs text-gray-400 flex gap-4">
            <a href="#privacy" className="hover:text-white">Privacy Policy</a>
            <a href="#terms" className="hover:text-white">Terms & Conditions</a>
            <a href="#contact" className="hover:text-white">Contact</a>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-[380px] bg-white shadow-2xl">
            <button 
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute top-3 right-3 text-ink-500 hover:text-ink-900 font-bold text-xl leading-none z-10 p-2"
              aria-label="Close"
            >
              &times;
            </button>
            <LoginPage />
          </div>
        </div>
      )}

      {/* Demo Modal */}
      {isDemoModalOpen && (
        <RequestDemoModal onClose={() => setIsDemoModalOpen(false)} />
      )}
    </div>
  );
}

function RequestDemoModal({ onClose }) {
  const [status, setStatus] = useState({ loading: false, success: false, error: null });
  const [source, setSource] = useState('Website');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, success: false, error: null });
    const formData = new FormData(e.target);
    
    let finalSource = source;
    if (source === 'Other') {
      finalSource = formData.get('otherSource');
    }

    const payload = {
      type: 'demo',
      institution_name: formData.get('institution_name'),
      institution_type: formData.get('institution_type'),
      name: formData.get('name'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      address: formData.get('address'),
      source: finalSource
    };

    try {
      await apiClient.post('/platform/inquiries', payload);
      setStatus({ loading: false, success: true, error: null });
    } catch (err) {
      setStatus({ loading: false, success: false, error: err.message });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white shadow-2xl p-6 rounded my-8">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-500 hover:text-ink-900 font-bold text-xl leading-none z-10"
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-4 text-ink-900">Request Demo</h2>
        
        {status.success ? (
          <div className="py-8 text-center">
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <h3 className="text-xl font-bold text-ink-900 mb-2">Request Received!</h3>
            <p className="text-ink-500">Our team will contact you shortly to schedule your demo.</p>
            <button onClick={onClose} className="mt-6 bg-microsoft-blue text-white px-6 py-2 rounded font-semibold text-sm hover:bg-microsoft-hover">Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-ink-900 mb-1">Institution Name</label>
              <input required name="institution_name" className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-microsoft-blue" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-900 mb-1">Institution Type</label>
              <input name="institution_type" className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-microsoft-blue" placeholder="e.g. School, College" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-900 mb-1">Contact Person Name</label>
              <input required name="name" className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-microsoft-blue" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-900 mb-1">Contact Number</label>
              <input required name="phone" className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-microsoft-blue" placeholder="+1..." />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-900 mb-1">Email Address</label>
              <input required type="email" name="email" className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-microsoft-blue" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-900 mb-1">Address</label>
              <input name="address" className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-microsoft-blue" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-900 mb-1">How did you hear about us?</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-microsoft-blue">
                <option value="Website">Website</option>
                <option value="Social media">Social media</option>
                <option value="Linkedin">Linkedin</option>
                <option value="Other">Other</option>
              </select>
            </div>
            {source === 'Other' && (
              <div>
                <input required name="otherSource" className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-microsoft-blue" placeholder="Please specify" />
              </div>
            )}
            
            {status.error && <div className="text-red-500 text-sm">{status.error}</div>}
            
            <button disabled={status.loading} className="w-full bg-microsoft-blue text-white font-bold py-3 mt-4 rounded hover:bg-microsoft-hover transition-colors text-sm disabled:opacity-50">
              {status.loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
