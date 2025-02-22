const express = require('express');
const axios = require('axios');
const Transaction = require('../models/Transaction');

const router = express.Router();

// ✅ Function to Convert Month Name to Number
const getMonthNumber = (month) => {
  const monthNames = {
    January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
    July: 7, August: 8, September: 9, October: 10, November: 11, December: 12
  };
  return monthNames[month] || null;
};

// ✅ 1. Initialize Database
router.get('/initialize', async (req, res) => {
    try {
      const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
  
      // Clear existing data
      await Transaction.deleteMany({});
  
      // Transform data with proper date conversion
      const formattedData = response.data.map(item => {
        let parsedDate;
  
        try {
          parsedDate = new Date(item.dateOfSale); // Try parsing date directly
          if (isNaN(parsedDate.getTime())) throw new Error("Invalid Date");
  
          // Convert to UTC string (MongoDB stores dates in UTC)
          parsedDate = new Date(parsedDate.toISOString());
        } catch (error) {
          console.error(`🚨 Invalid Date Found: ${item.dateOfSale}`);
          return null; // Skip invalid entries
        }
  
        return {
          id: item.id,
          title: item.title,
          price: item.price,
          description: item.description,
          category: item.category,
          image: item.image,
          sold: item.sold,
          dateOfSale: parsedDate, // ✅ Ensure MongoDB stores a valid date
        };
      }).filter(item => item !== null); // Remove invalid records
  
      // Insert transformed data into MongoDB
      await Transaction.insertMany(formattedData);
  
      res.json({ message: 'Database initialized successfully' });
    } catch (error) {
      console.error('🚨 Initialization Error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  

  
  

// ✅ 2. List Transactions with Search & Pagination

// ✅ GET: Fetch transactions with pagination & search by month
router.get('/transactions', async (req, res) => {
  try {
    let { month, search, page = 1, perPage = 10 } = req.query;
    page = parseInt(page);
    perPage = parseInt(perPage);

    // ✅ Ensure month is a valid string
    if (!month) {
      return res.status(400).json({ error: "Month is required (e.g., 'February')" });
    }

    // ✅ Convert month name to number (e.g., "February" → 2)
    const monthNames = {
      January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
      July: 7, August: 8, September: 9, October: 10, November: 11, December: 12
    };

    const monthNumber = monthNames[month];
    if (!monthNumber) {
      return res.status(400).json({ error: "Invalid month name. Use full name (e.g., 'February')." });
    }

    // ✅ Date range filter (ignoring year)
    const transactions = await Transaction.find({
      $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] }, // Extract month from date
      ...(search ? {  // ✅ Search filter on title/description/price
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { price: !isNaN(search) ? Number(search) : null }
        ]
      } : {})
    })
      .skip((page - 1) * perPage) // Pagination
      .limit(perPage);

    res.json({ total: transactions.length, transactions });
  } catch (error) {
    console.error('🚨 Error fetching transactions:', error);
    res.status(500).json({ error: error.message });
  }
});



// ✅ 1. Statistics API (Fixed Month Filtering)
router.get('/statistics', async (req, res) => {
  try {
    const { month } = req.query;
    const monthNumber = getMonthNumber(month);
    if (!monthNumber) {
      return res.status(400).json({ error: "Invalid month. Use full name (e.g., 'February')." });
    }

    // ✅ Filter transactions by month (ignoring year)
    const transactions = await Transaction.find({
      $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] }
    });

    // ✅ Calculate statistics
    const totalSale = transactions.reduce((sum, txn) => txn.sold ? sum + txn.price : sum, 0);
    const soldItems = transactions.filter(txn => txn.sold).length;
    const notSoldItems = transactions.length - soldItems;

    res.json({ totalSale, soldItems, notSoldItems });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ 2. Bar Chart API (Fixed Month Filtering)
router.get('/bar-chart', async (req, res) => {
  try {
    const { month } = req.query;
    const monthNumber = getMonthNumber(month);
    if (!monthNumber) {
      return res.status(400).json({ error: "Invalid month. Use full name (e.g., 'February')." });
    }

    // ✅ Define price ranges
    const priceRanges = [
      { range: "0-100", min: 0, max: 100 },
      { range: "101-200", min: 101, max: 200 },
      { range: "201-300", min: 201, max: 300 },
      { range: "301-400", min: 301, max: 400 },
      { range: "401-500", min: 401, max: 500 },
      { range: "501-600", min: 501, max: 600 },
      { range: "601-700", min: 601, max: 700 },
      { range: "701-800", min: 701, max: 800 },
      { range: "801-900", min: 801, max: 900 },
      { range: "901-above", min: 901, max: Infinity }
    ];

    let response = {};

    // ✅ Loop through each price range and count items
    for (const { range, min, max } of priceRanges) {
      response[range] = await Transaction.countDocuments({
        $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] },
        price: { $gte: min, $lt: max }
      });
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ 3. Pie Chart API (Fixed Month Filtering)
router.get('/pie-chart', async (req, res) => {
  try {
    const { month } = req.query;
    const monthNumber = getMonthNumber(month);
    if (!monthNumber) {
      return res.status(400).json({ error: "Invalid month. Use full name (e.g., 'February')." });
    }

    // ✅ Aggregate unique categories and count items per category
    const categories = await Transaction.aggregate([
      { $match: { $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] } } },
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);

    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ 4. Combined API (Fetching All Three APIs)
router.get('/combined', async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) {
      return res.status(400).json({ error: "Month is required (e.g., 'February')." });
    }

    // ✅ Fetch all APIs in parallel
    const [statistics, barChart, pieChart] = await Promise.all([
      fetch(`${req.protocol}://${req.get('host')}/api/statistics?month=${month}`).then(res => res.json()),
      fetch(`${req.protocol}://${req.get('host')}/api/bar-chart?month=${month}`).then(res => res.json()),
      fetch(`${req.protocol}://${req.get('host')}/api/pie-chart?month=${month}`).then(res => res.json())
    ]);

    res.json({ statistics, barChart, pieChart });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', (req, res) => {
    res.json({ message: 'Welcome to the Product Transactions API!' });
  });
  

module.exports = router;
