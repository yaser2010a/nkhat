'use strict';

const fs = require('fs');
const path = require('path');

function deleteProductImage(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('/uploads/products/')) return;

  const filename = path.basename(imageUrl);
  const filePath = path.join(__dirname, '..', 'uploads', 'products', filename);

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn('[cleanup] Failed to delete image:', filePath, err.message);
  }
}

module.exports = { deleteProductImage };
