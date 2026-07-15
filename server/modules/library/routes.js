const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth);

router.get('/books', requirePermission('library.view'), controller.listBooks);
router.post('/books', requirePermission('library.manage'), controller.createBook);
router.put('/books/:id', requirePermission('library.manage'), controller.updateBook);
router.delete('/books/:id', requirePermission('library.manage'), controller.deleteBook);

router.get('/borrowers', requirePermission('library.manage'), controller.listBorrowers);

router.get('/loans', requirePermission('library.view'), controller.listLoans);
router.post('/loans', requirePermission('library.manage'), controller.issueLoan);
router.patch('/loans/:id/return', requirePermission('library.manage'), controller.returnLoan);

module.exports = router;
