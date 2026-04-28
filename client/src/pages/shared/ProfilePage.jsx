import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import { UserCircleIcon, KeyIcon, PhoneIcon, MapPinIcon } from '@heroicons/react/24/outline';

const SKILLS = ['medical','logistics','driving','food','rescue','communication'];

const ProfilePage = () => {
  const { user, loadUser } = useAuth();
  const [tab, setTab] = useState('profile');
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    name:   user?.name   || '',
    phone:  user?.phone  || '',
    region: user?.region || '',
    skillTags: user?.skillTags || [],
  });

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const toggleSkill = (s) => {
    setProfile(p => ({
      ...p,
      skillTags: p.skillTags.includes(s)
        ? p.skillTags.filter(x => x !== s)
        : [...p.skillTags, s],
    }));
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.patch('/auth/profile', profile);
      toast.success('Profile updated successfully');
      // Refresh user in context
      if (loadUser) await loadUser();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      return toast.error('New passwords do not match');
    }
    if (passwords.newPassword.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    setSaving(true);
    try {
      await API.patch('/auth/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast.success('Password changed successfully');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password change failed');
    } finally { setSaving(false); }
  };

  const roleColors = {
    admin:     'bg-pink-100 text-pink-700',
    citizen:   'bg-primary-100 text-primary-700',
    volunteer: 'bg-teal-50 text-teal-700',
    ngo:       'bg-warning-50 text-warning-700',
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header card */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className={`h-16 w-16 rounded-2xl flex items-center justify-center
                          font-display font-bold text-3xl flex-shrink-0
                          ${roleColors[user?.role] || 'bg-neutral-100 text-neutral-600'}`}>
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-neutral-900">{user?.name}</h1>
            <p className="text-neutral-500 text-sm">{user?.email}</p>
            <span className={`chip text-xs mt-1 ${roleColors[user?.role]}`}>
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl w-fit">
        {[
          { key: 'profile',  label: 'Profile info' },
          { key: 'password', label: 'Change password' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all
              ${tab === key ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === 'profile' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <h2 className="section-title mb-5 flex items-center gap-2">
            <UserCircleIcon className="h-5 w-5 text-primary-500" />
            Personal information
          </h2>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <input className="input" value={profile.name}
                onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                placeholder="Your full name" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label flex items-center gap-1">
                  <PhoneIcon className="h-3 w-3" /> Phone number
                </label>
                <input className="input" value={profile.phone}
                  onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                  placeholder="10-digit number" pattern="[0-9]{10}" />
              </div>
              <div>
                <label className="label flex items-center gap-1">
                  <MapPinIcon className="h-3 w-3" /> Region / Zone
                </label>
                <input className="input" value={profile.region}
                  onChange={e => setProfile(p => ({ ...p, region: e.target.value }))}
                  placeholder="e.g. Ludhiana, Punjab" />
              </div>
            </div>

            {/* Email — read only */}
            <div>
              <label className="label">Email address</label>
              <input className="input bg-neutral-50 text-neutral-400 cursor-not-allowed"
                value={user?.email} readOnly
                title="Email cannot be changed" />
              <p className="text-xs text-neutral-400 mt-1">Email address cannot be changed</p>
            </div>

            {/* Skill tags for volunteers */}
            {user?.role === 'volunteer' && (
              <div>
                <label className="label">Skill tags</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {SKILLS.map(s => (
                    <button key={s} type="button" onClick={() => toggleSkill(s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all capitalize
                        ${profile.skillTags.includes(s)
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-300'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" disabled={saving} className="btn-primary w-full py-3">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        </motion.div>
      )}

      {/* Password tab */}
      {tab === 'password' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <h2 className="section-title mb-5 flex items-center gap-2">
            <KeyIcon className="h-5 w-5 text-primary-500" />
            Change password
          </h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="label">Current password</label>
              <input type="password" className="input" required
                placeholder="Enter current password"
                value={passwords.currentPassword}
                onChange={e => setPasswords(p => ({ ...p, currentPassword: e.target.value }))} />
            </div>
            <div>
              <label className="label">New password</label>
              <input type="password" className="input" required minLength={6}
                placeholder="Minimum 6 characters"
                value={passwords.newPassword}
                onChange={e => setPasswords(p => ({ ...p, newPassword: e.target.value }))} />
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input type="password" className="input" required
                placeholder="Repeat new password"
                value={passwords.confirmPassword}
                onChange={e => setPasswords(p => ({ ...p, confirmPassword: e.target.value }))} />
              {passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword && (
                <p className="text-xs text-danger-600 mt-1">Passwords do not match</p>
              )}
            </div>
            <button type="submit"
              disabled={saving || passwords.newPassword !== passwords.confirmPassword}
              className="btn-primary w-full py-3">
              {saving ? 'Changing...' : 'Change password'}
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
};

export default ProfilePage;