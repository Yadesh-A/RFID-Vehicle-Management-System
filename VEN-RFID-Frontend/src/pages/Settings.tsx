import React, { useState } from 'react';
import { Settings as SettingsIcon, Bell, Shield, Database, HardDrive, Save, Clock } from 'lucide-react';
import { useDynamicTime } from '../hooks/useDynamicTime';

const Settings: React.FC = () => {
  const { formattedDate, formattedDay, formatTime } = useDynamicTime();
  const [activeTab, setActiveTab] = useState('notifications');
  
  const renderTabContent = () => {
    switch (activeTab) {
      case 'notifications':
        return <NotificationSettings />;
      case 'security':
        return <SecuritySettings />;
      case 'storage':
        return <StorageSettings />;
      default:
        return <NotificationSettings />;
    }
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center">
          <SettingsIcon className="h-6 w-6 text-blue-600 mr-2" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Clock size={14} />
          <span>{formattedDay}</span>
          <span className="mx-2">•</span>
          <span>{formattedDate}</span>
          <span className="mx-2">•</span>
          <span>{formatTime('p')}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="card p-4">
          <nav>
            <ul className="space-y-1">
              <li>
                <button
                  className={`w-full text-left px-3 py-2 rounded-md flex items-center ${
                    activeTab === 'notifications'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/50'
                  }`}
                  onClick={() => setActiveTab('notifications')}
                >
                  <Bell size={18} className="mr-2" />
                  Notifications
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left px-3 py-2 rounded-md flex items-center ${
                    activeTab === 'security'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/50'
                  }`}
                  onClick={() => setActiveTab('security')}
                >
                  <Shield size={18} className="mr-2" />
                  Security
                </button>
              </li>
              <li>
                <button
                  className={`w-full text-left px-3 py-2 rounded-md flex items-center ${
                    activeTab === 'storage'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/50'
                  }`}
                  onClick={() => setActiveTab('storage')}
                >
                  <Database size={18} className="mr-2" />
                  Storage & Retention
                </button>
              </li>
            </ul>
          </nav>
        </div>
        
        {/* Main content */}
        <div className="lg:col-span-3 card p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

const NotificationSettings: React.FC = () => {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Notification Settings</h2>
      
      <div className="space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
          <h3 className="text-md font-medium mb-3">Alert Preferences</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300">Unauthorized Vehicle Alerts</label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Receive alerts when unauthorized vehicles enter the premises
                </p>
              </div>
              <div className="relative inline-block w-10 mr-2 align-middle select-none">
                <input 
                  type="checkbox" 
                  name="toggle" 
                  id="unauthorized-toggle" 
                  className="sr-only toggle-checkbox"
                  defaultChecked
                />
                <label 
                  htmlFor="unauthorized-toggle" 
                  className="block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-700 cursor-pointer"
                ></label>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300">After-Hours Entry Alerts</label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Get notified about entries outside of business hours
                </p>
              </div>
              <div className="relative inline-block w-10 mr-2 align-middle select-none">
                <input 
                  type="checkbox" 
                  name="toggle" 
                  id="after-hours-toggle" 
                  className="sr-only toggle-checkbox"
                  defaultChecked
                />
                <label 
                  htmlFor="after-hours-toggle" 
                  className="block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-700 cursor-pointer"
                ></label>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300">System Status Alerts</label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Receive alerts about system errors or camera status changes
                </p>
              </div>
              <div className="relative inline-block w-10 mr-2 align-middle select-none">
                <input 
                  type="checkbox" 
                  name="toggle" 
                  id="system-toggle" 
                  className="sr-only toggle-checkbox"
                  defaultChecked
                />
                <label 
                  htmlFor="system-toggle" 
                  className="block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-700 cursor-pointer"
                ></label>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-md font-medium mb-3">Notification Methods</h3>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="email-notifications" 
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                defaultChecked
              />
              <label htmlFor="email-notifications" className="ml-2 block text-slate-700 dark:text-slate-300">
                Email Notifications
              </label>
            </div>
            
            <div className="pl-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email Recipients
              </label>
              <input 
                type="text" 
                className="input w-full" 
                defaultValue="admin@example.com, security@example.com"
              />
            </div>
            
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="sms-notifications" 
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
              />
              <label htmlFor="sms-notifications" className="ml-2 block text-slate-700 dark:text-slate-300">
                SMS Notifications
              </label>
            </div>
            
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="push-notifications" 
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                defaultChecked
              />
              <label htmlFor="push-notifications" className="ml-2 block text-slate-700 dark:text-slate-300">
                Push Notifications
              </label>
            </div>
          </div>
        </div>
        
        <div className="pt-4 mt-6 border-t border-slate-200 dark:border-slate-700 text-right">
          <button className="btn btn-primary flex items-center ml-auto">
            <Save size={16} className="mr-2" /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

const SecuritySettings: React.FC = () => {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Security Settings</h2>
      
      <div className="space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
          <h3 className="text-md font-medium mb-3">Access Control</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Session Timeout (minutes)
              </label>
              <input type="number" className="input w-48" defaultValue="30" min="5" max="120" />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Users will be logged out after this period of inactivity
              </p>
            </div>
            
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="two-factor-auth" 
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
              />
              <label htmlFor="two-factor-auth" className="ml-2 block text-slate-700 dark:text-slate-300">
                Enable two-factor authentication for all users
              </label>
            </div>
            
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="ip-restriction" 
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                defaultChecked
              />
              <label htmlFor="ip-restriction" className="ml-2 block text-slate-700 dark:text-slate-300">
                Restrict access to approved IP addresses
              </label>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-md font-medium mb-3">Password Policy</h3>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="strong-password" 
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                defaultChecked
              />
              <label htmlFor="strong-password" className="ml-2 block text-slate-700 dark:text-slate-300">
                Require strong passwords (min. 8 chars, uppercase, lowercase, numbers, symbols)
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Password Expiration (days)
              </label>
              <input type="number" className="input w-48" defaultValue="90" min="30" max="365" />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Users will be required to change their password after this many days
              </p>
            </div>
            
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="password-history" 
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                defaultChecked
              />
              <label htmlFor="password-history" className="ml-2 block text-slate-700 dark:text-slate-300">
                Prevent reuse of previous 5 passwords
              </label>
            </div>
          </div>
        </div>
        
        <div className="pt-4 mt-6 border-t border-slate-200 dark:border-slate-700 text-right">
          <button className="btn btn-primary flex items-center ml-auto">
            <Save size={16} className="mr-2" /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

const StorageSettings: React.FC = () => {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Storage & Retention Settings</h2>
      
      <div className="space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
          <h3 className="text-md font-medium mb-3">Storage Usage</h3>
          
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-md">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">System Storage</span>
                <span className="text-sm text-slate-700 dark:text-slate-300">65% (650 GB / 1 TB)</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full w-[65%]"></div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-md">
                <div className="flex items-center">
                  <HardDrive size={18} className="text-blue-600 mr-2" />
                  <span className="font-medium">Video Footage</span>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">500 GB</span>
                    <span className="text-slate-700 dark:text-slate-300">50%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-1">
                    <div className="bg-green-500 h-2 rounded-full w-[50%]"></div>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-md">
                <div className="flex items-center">
                  <Database size={18} className="text-blue-600 mr-2" />
                  <span className="font-medium">Database</span>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">150 GB</span>
                    <span className="text-slate-700 dark:text-slate-300">15%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-1">
                    <div className="bg-blue-500 h-2 rounded-full w-[15%]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-md font-medium mb-3">Data Retention</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Video Footage Retention Period
              </label>
              <select className="input w-full">
                <option>30 days</option>
                <option>60 days</option>
                <option>90 days</option>
                <option>180 days</option>
                <option>365 days</option>
              </select>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Video footage older than this will be automatically deleted
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Entry/Exit Records Retention
              </label>
              <select className="input w-full">
                <option>1 year</option>
                <option>2 years</option>
                <option>5 years</option>
                <option>7 years</option>
                <option>Indefinitely</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="compress-footage" 
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                defaultChecked
              />
              <label htmlFor="compress-footage" className="ml-2 block text-slate-700 dark:text-slate-300">
                Compress video footage after 7 days to save storage space
              </label>
            </div>
            
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="auto-backup" 
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                defaultChecked
              />
              <label htmlFor="auto-backup" className="ml-2 block text-slate-700 dark:text-slate-300">
                Enable automatic daily backups
              </label>
            </div>
          </div>
        </div>
        
        <div className="pt-4 mt-6 border-t border-slate-200 dark:border-slate-700 text-right">
          <button className="btn btn-primary flex items-center ml-auto">
            <Save size={16} className="mr-2" /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;