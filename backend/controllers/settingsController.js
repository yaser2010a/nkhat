'use strict';

const { query } = require('../config/db');

const EDITABLE_FIELDS = [
  'store_name',
  'store_tagline',
  'phone',
  'whatsapp',
  'whatsapp_message',
  'address',
  'maps_url',
  'instagram_url',
  'snapchat_url',
  'cr_number',
  'license_number',
  'about_title',
  'about_desc',
];

const FIELD_MAX_LENGTHS = {
  store_name: 150,
  store_tagline: 150,
  phone: 30,
  whatsapp: 30,
  whatsapp_message: 255,
  address: 255,
  maps_url: 512,
  instagram_url: 255,
  snapchat_url: 255,
  cr_number: 50,
  license_number: 50,
  about_title: 150,
  about_desc: 5000,
};

function formatSettings(row) {
  return {
    store_name: row.store_name,
    store_tagline: row.store_tagline,
    phone: row.phone,
    whatsapp: row.whatsapp,
    whatsapp_message: row.whatsapp_message,
    address: row.address,
    maps_url: row.maps_url,
    instagram_url: row.instagram_url,
    snapchat_url: row.snapchat_url,
    cr_number: row.cr_number,
    license_number: row.license_number,
    about_title: row.about_title,
    about_desc: row.about_desc,
    banner_image_url: row.banner_image_url,
    updated_at: row.updated_at,
  };
}

async function getSettingsRow() {
  const [row] = await query('SELECT * FROM site_settings WHERE id = 1 LIMIT 1');
  return row;
}

async function getPublicSettings(_req, res) {
  const row = await getSettingsRow();
  if (!row) {
    return res.status(404).json({ success: false, message: 'لم يتم إعداد بيانات المتجر بعد' });
  }
  res.json({ success: true, data: formatSettings(row) });
}

async function getAdminSettings(_req, res) {
  const row = await getSettingsRow();
  if (!row) {
    return res.status(404).json({ success: false, message: 'لم يتم إعداد بيانات المتجر بعد' });
  }
  res.json({ success: true, data: formatSettings(row) });
}

async function updateSettings(req, res) {
  const updates = [];
  const params = [];
  let i = 1;

  for (const field of EDITABLE_FIELDS) {
    if (req.body[field] === undefined) continue;
    const value = String(req.body[field] ?? '').trim();
    const maxLen = FIELD_MAX_LENGTHS[field];
    if (value.length > maxLen) {
      return res.status(400).json({ success: false, message: `الحقل "${field}" طويل جداً (الحد الأقصى ${maxLen} حرف)` });
    }
    updates.push(`${field} = $${i++}`);
    params.push(value);
  }

  if (req.file) {
    updates.push(`banner_image_url = $${i++}`);
    params.push(`/uploads/products/${req.file.filename}`);
  }

  if (updates.length === 0) {
    return res.status(400).json({ success: false, message: 'لا توجد بيانات للتحديث' });
  }

  updates.push('updated_at = NOW()');
  await query(`UPDATE site_settings SET ${updates.join(', ')} WHERE id = 1`, params);

  const row = await getSettingsRow();
  res.json({ success: true, message: 'تم حفظ إعدادات المتجر', data: formatSettings(row) });
}

module.exports = {
  getPublicSettings,
  getAdminSettings,
  updateSettings,
};