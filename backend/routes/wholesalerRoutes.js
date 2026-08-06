const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  createSeller,
  getSellers,
  importPrices,
  getComparisonPrices,
  getPriceHistory,
  deleteImportBatch,
  getNormalizations,
  addNormalization,
} = require('../controllers/wholesalerController');

// Protect all wholesaler routes
router.use(authenticate);

router.post('/seller', createSeller);
router.get('/sellers', getSellers);

router.post('/import', importPrices);
router.delete('/import', deleteImportBatch);

router.get('/prices', getComparisonPrices);
router.get('/history', getPriceHistory);

router.get('/normalizations', getNormalizations);
router.post('/normalizations', addNormalization);

module.exports = router;
