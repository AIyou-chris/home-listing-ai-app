import React, { useState, useRef } from 'react';
import { Upload, Phone, Mail, Globe, Facebook, Instagram, Twitter, Linkedin, Youtube, MessageCircle, QrCode, Download, Eye, Palette, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import QRCodeManagementPage from './QRCodeManagementPage';

interface AgentProfile {
  fullName: string;
  professionalTitle: string;
  company: string;
  phone: string;
  email: string;
  website: string;
  bio: string;
  brandColor: string;
  socialMedia: {
    facebook: string;
    instagram: string;
    twitter: string;
    linkedin: string;
    youtube: string;
  };
  headshot: string | null;
  logo: string | null;
}

const AICardPage: React.FC = () => {
  const [profile, setProfile] = useState<AgentProfile>({
    fullName: 'Sarah Johnson',
    professionalTitle: 'Luxury Real Estate Specialist',
    company: 'Prestige Properties',
    phone: '(305) 555-1234',
    email: 'sarah.j@prestigeprop.com',
    website: 'https://prestigeproperties.com',
    bio: 'With over 15 years of experience in the luxury market, Sarah Johnson combines deep market knowledge with personalized service for client success. Her dedication and expertise make her a trusted advisor for buyers and sellers of distinguished properties.',
    brandColor: '#0ea5e9',
    socialMedia: {
      facebook: 'https://facebook.com/sarahjohnsonrealty',
      instagram: 'https://instagram.com/sarahjohnsonrealty',
      twitter: 'https://twitter.com/sjrealty',
      linkedin: 'https://linkedin.com/in/sarahjohnsonrealtor',
      youtube: 'https://youtube.com/@sarahjohnsonrealty'
    },
    headshot: null,
    logo: null
  });

  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'qr-codes'>('edit');
  const [showAISidekick, setShowAISidekick] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    // Check if we're on mobile (screen width < 768px)
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return {
      basic: isMobile,
      contact: isMobile,
      images: isMobile,
      bio: isMobile,
      social: isMobile
    };
  });
  const headshotInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (field: keyof AgentProfile, value: any) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSocialMediaChange = (platform: keyof AgentProfile['socialMedia'], value: string) => {
    setProfile(prev => ({
      ...prev,
      socialMedia: {
        ...prev.socialMedia,
        [platform]: value
      }
    }));
  };

  const handleImageUpload = (type: 'headshot' | 'logo', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setProfile(prev => ({
          ...prev,
          [type]: result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const generateQRCode = () => {
    // TODO: Implement QR code generation
    console.log('Generating QR code for AI Card...');
  };

  const downloadCard = () => {
    // TODO: Implement card download as image
    console.log('Downloading AI Card...');
  };

  const CollapsibleSection: React.FC<{
    title: string;
    sectionKey: string;
    children: React.ReactNode;
  }> = ({ title, sectionKey, children }) => {
    const isCollapsed = collapsedSections[sectionKey];
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between p-4 md:p-6 text-left hover:bg-gray-50 transition-colors"
        >
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {isCollapsed ? (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          )}
        </button>
        {!isCollapsed && (
          <div className="px-4 pb-4 md:px-6 md:pb-6 border-t border-gray-100">
            {children}
          </div>
        )}
      </div>
    );
  };

  const AICardPreview = () => (
    <div className="relative">
      {/* AI Card Container */}
      <div 
        className="relative bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl overflow-hidden border border-gray-200"
        style={{ 
          width: '400px', 
          height: '700px',
          background: `linear-gradient(135deg, ${profile.brandColor}10 0%, white 50%, ${profile.brandColor}05 100%)`
        }}
      >
        {/* Header with brand color accent */}
        <div 
          className="h-3 w-full"
          style={{ backgroundColor: profile.brandColor }}
        />
        
        {/* Main Content */}
        <div className="p-8 h-full flex flex-col">
          {/* Logo Section */}
          {profile.logo && (
            <div className="flex justify-center mb-6">
              <img 
                src={profile.logo} 
                alt="Company Logo" 
                className="h-12 w-auto object-contain"
              />
            </div>
          )}

          {/* Agent Photo & Info */}
          <div className="flex flex-col items-center text-center mb-8">
            {/* Headshot */}
            <div className="relative mb-4">
              {profile.headshot ? (
                <img 
                  src={profile.headshot} 
                  alt={profile.fullName}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                  style={{ borderColor: profile.brandColor }}
                />
              ) : (
                <div 
                  className="w-24 h-24 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-2xl font-bold text-white"
                  style={{ backgroundColor: profile.brandColor }}
                >
                  {profile.fullName.split(' ').map(n => n[0]).join('')}
                </div>
              )}
            </div>

            {/* Name & Title */}
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{profile.fullName}</h2>
            <p className="text-lg text-gray-600 mb-1">{profile.professionalTitle}</p>
            <p className="text-base font-medium" style={{ color: profile.brandColor }}>
              {profile.company}
            </p>
          </div>

          {/* Contact Info */}
          <div className="space-y-3 mb-8">
            <div className="flex items-center justify-center space-x-2 text-gray-700">
              <Phone className="w-4 h-4" style={{ color: profile.brandColor }} />
              <span className="text-sm">{profile.phone}</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-gray-700">
              <Mail className="w-4 h-4" style={{ color: profile.brandColor }} />
              <span className="text-sm">{profile.email}</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-gray-700">
              <Globe className="w-4 h-4" style={{ color: profile.brandColor }} />
              <span className="text-sm">{profile.website}</span>
            </div>
          </div>

          {/* Bio */}
          <div className="mb-6 flex-1">
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">
              {profile.bio}
            </p>
          </div>

          {/* How Can I Help Button */}
          <div className="mb-8">
            <button
              onClick={() => setShowAISidekick(true)}
              className="w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-105 shadow-lg text-base"
              style={{ backgroundColor: profile.brandColor }}
            >
              How can I help?
            </button>
          </div>

          {/* Social Media Icons */}
          <div className="flex justify-center space-x-4 mb-6">
            {profile.socialMedia.facebook && (
              <Facebook className="w-5 h-5 text-blue-600 hover:scale-110 transition-transform cursor-pointer" />
            )}
            {profile.socialMedia.instagram && (
              <Instagram className="w-5 h-5 text-pink-500 hover:scale-110 transition-transform cursor-pointer" />
            )}
            {profile.socialMedia.twitter && (
              <Twitter className="w-5 h-5 text-blue-400 hover:scale-110 transition-transform cursor-pointer" />
            )}
            {profile.socialMedia.linkedin && (
              <Linkedin className="w-5 h-5 text-blue-700 hover:scale-110 transition-transform cursor-pointer" />
            )}
            {profile.socialMedia.youtube && (
              <Youtube className="w-5 h-5 text-red-600 hover:scale-110 transition-transform cursor-pointer" />
            )}
          </div>

          {/* Share Button */}
          <div className="flex justify-center">
            <button 
              onClick={() => {
                // TODO: Implement share functionality
                console.log('Sharing AI Card...');
              }}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg"
              style={{ 
                backgroundColor: profile.brandColor, 
                color: 'white',
                marginBottom: '50px'
              }}
            >
              <Share2 className="w-5 h-5" />
              <span>Share Card</span>
            </button>
          </div>
        </div>

        {/* AI Sidekick Chat Bubble */}
        <button
          onClick={() => setShowAISidekick(!showAISidekick)}
          className="absolute bottom-4 right-4 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
          style={{ backgroundColor: profile.brandColor }}
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </button>

        {/* AI Chat Interface */}
        {showAISidekick && (
          <div className="absolute bottom-20 right-4 w-80 h-96 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
            {/* Chat Header */}
            <div 
              className="p-4 text-white"
              style={{ backgroundColor: profile.brandColor }}
            >
              <h3 className="font-semibold">AI Assistant</h3>
              <p className="text-sm opacity-90">Ask me about properties!</p>
            </div>
            
            {/* Chat Messages */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                <p className="text-sm">Hi! I'm {profile.fullName}'s AI assistant. How can I help you today?</p>
              </div>
              <div className="bg-blue-500 text-white rounded-lg p-3 max-w-xs ml-auto">
                <p className="text-sm">I'm looking for a 3-bedroom home</p>
              </div>
              <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                <p className="text-sm">Great! I can help you find the perfect 3-bedroom home. What's your preferred location and budget range?</p>
              </div>
            </div>
            
            {/* Chat Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Type your message..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  className="px-4 py-2 text-white rounded-lg text-sm font-medium"
                  style={{ backgroundColor: profile.brandColor }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          {/* Title Section */}
          <div className="text-center lg:text-left">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">AI Business Card</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Create your interactive AI-powered business card</p>
          </div>
          
          {/* Controls Section */}
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
            {/* Tab Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1 mx-auto sm:mx-0">
              <button
                onClick={() => setActiveTab('edit')}
                className={`flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex-1 sm:flex-none ${
                  activeTab === 'edit' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Palette className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex-1 sm:flex-none ${
                  activeTab === 'preview' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Preview</span>
              </button>
              <button
                onClick={() => setActiveTab('qr-codes')}
                className={`flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex-1 sm:flex-none ${
                  activeTab === 'qr-codes' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <QrCode className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>QR Codes</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 sm:space-x-3">
              <button
                onClick={generateQRCode}
                className="flex items-center justify-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium flex-1 sm:flex-none"
              >
                <QrCode className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Generate QR</span>
                <span className="xs:hidden">QR</span>
              </button>
              
              <button
                onClick={downloadCard}
                className="flex items-center justify-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm font-medium flex-1 sm:flex-none"
              >
                <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Download</span>
                <span className="xs:hidden">Save</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-6">
        {activeTab === 'edit' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Left Side - Form */}
            <div className="space-y-6 lg:space-y-8">
              {/* Basic Information */}
              <CollapsibleSection title="👤 Basic Information" sectionKey="basic">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name*
                    </label>
                    <input
                      type="text"
                      value={profile.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Professional Title*
                    </label>
                    <input
                      type="text"
                      value={profile.professionalTitle}
                      onChange={(e) => handleInputChange('professionalTitle', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company*
                    </label>
                    <input
                      type="text"
                      value={profile.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand Color
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={profile.brandColor}
                        onChange={(e) => handleInputChange('brandColor', e.target.value)}
                        className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={profile.brandColor}
                        onChange={(e) => handleInputChange('brandColor', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleSection>

              {/* Contact Information */}
              <CollapsibleSection title="📞 Contact Information" sectionKey="contact">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number*
                    </label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address*
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website URL
                    </label>
                    <input
                      type="url"
                      value={profile.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </CollapsibleSection>

              {/* Images */}
              <CollapsibleSection title="🖼️ Images" sectionKey="images">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Headshot */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Professional Headshot
                    </label>
                    <div 
                      onClick={() => headshotInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
                    >
                      {profile.headshot ? (
                        <img 
                          src={profile.headshot} 
                          alt="Headshot" 
                          className="w-24 h-24 rounded-full mx-auto object-cover mb-2"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gray-200 mx-auto mb-2 flex items-center justify-center">
                          <Upload className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <p className="text-sm text-gray-600">Click to upload headshot</p>
                    </div>
                    <input
                      ref={headshotInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload('headshot', e)}
                      className="hidden"
                    />
                  </div>

                  {/* Logo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Logo
                    </label>
                    <div 
                      onClick={() => logoInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
                    >
                      {profile.logo ? (
                        <img 
                          src={profile.logo} 
                          alt="Logo" 
                          className="w-24 h-16 mx-auto object-contain mb-2"
                        />
                      ) : (
                        <div className="w-24 h-16 bg-gray-200 mx-auto mb-2 flex items-center justify-center rounded">
                          <Upload className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <p className="text-sm text-gray-600">Click to upload logo</p>
                    </div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload('logo', e)}
                      className="hidden"
                    />
                  </div>
                </div>
              </CollapsibleSection>

              {/* Professional Bio */}
              <CollapsibleSection title="📝 Professional Bio" sectionKey="bio">
                <textarea
                  value={profile.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  rows={6}
                  placeholder="Tell visitors about your experience and expertise..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="text-sm text-gray-500 mt-2">
                  {profile.bio.length}/500 characters
                </p>
              </CollapsibleSection>

              {/* Social Media Links */}
              <CollapsibleSection title="🔗 Social Media Links" sectionKey="social">
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Facebook className="w-5 h-5 text-blue-600" />
                    <input
                      type="url"
                      placeholder="https://facebook.com/username"
                      value={profile.socialMedia.facebook}
                      onChange={(e) => handleSocialMediaChange('facebook', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Instagram className="w-5 h-5 text-pink-500" />
                    <input
                      type="url"
                      placeholder="https://instagram.com/username"
                      value={profile.socialMedia.instagram}
                      onChange={(e) => handleSocialMediaChange('instagram', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Twitter className="w-5 h-5 text-blue-400" />
                    <input
                      type="url"
                      placeholder="https://twitter.com/username"
                      value={profile.socialMedia.twitter}
                      onChange={(e) => handleSocialMediaChange('twitter', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Linkedin className="w-5 h-5 text-blue-700" />
                    <input
                      type="url"
                      placeholder="https://linkedin.com/in/username"
                      value={profile.socialMedia.linkedin}
                      onChange={(e) => handleSocialMediaChange('linkedin', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Youtube className="w-5 h-5 text-red-600" />
                    <input
                      type="url"
                      placeholder="https://youtube.com/@username"
                      value={profile.socialMedia.youtube}
                      onChange={(e) => handleSocialMediaChange('youtube', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </CollapsibleSection>
            </div>

            {/* Right Side - Live Preview */}
            <div className="lg:sticky lg:top-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 text-center">
                  ✨ Live Preview
                </h2>
                <div className="flex justify-center">
                  <div className="transform scale-75 sm:scale-90 lg:scale-100 origin-top">
                    <AICardPreview />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'preview' ? (
          // Full Screen Preview
          <div className="flex justify-center items-center min-h-full">
            <AICardPreview />
          </div>
        ) : (
          // QR Codes Management
          <QRCodeManagementPage />
        )}
      </div>
    </div>
  );
};

export default AICardPage;
