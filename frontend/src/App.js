import './App.css';
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const App = () => {
  const [month, setMonth] = useState("March");
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statistics, setStatistics] = useState({});
  const [barChartData, setBarChartData] = useState({});
  const recordsPerPage = 5;

  useEffect(() => {
    fetchTransactions();
    fetchStatistics();
    fetchBarChartData();
  }, [month, page, search]);

  const fetchTransactions = async () => {
    const res = await axios.get(`http://localhost:5000/api/transactions`, {
      params: { month, search }
    });
    
    const allTransactions = res.data.transactions;
    setTotalPages(Math.ceil(allTransactions.length / recordsPerPage)); // Calculate pages dynamically
    
    // Paginate transactions (only show 5 per page)
    const startIndex = (page - 1) * recordsPerPage;
    const paginatedTransactions = allTransactions.slice(startIndex, startIndex + recordsPerPage);
    setTransactions(paginatedTransactions);
  };

  const fetchStatistics = async () => {
    const res = await axios.get(`http://localhost:5000/api/statistics?month=${month}`);
    setStatistics(res.data);
  };

  const fetchBarChartData = async () => {
    const res = await axios.get(`http://localhost:5000/api/bar-chart?month=${month}`);
    setBarChartData(res.data);
  };

  return (
    <div className="dashboard-container">
      <div className="heading">Transaction Dashboard</div>
      
      <div className="controls">
        <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={month} onChange={(e) => setMonth(e.target.value)}>
          {months.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div className="statistics">
        <div className="stat-box">Total Sale: ${statistics.totalSale || 0}</div>
        <div className="stat-box">Sold Items: {statistics.soldItems || 0}</div>
        <div className="stat-box">Not Sold Items: {statistics.notSoldItems || 0}</div>
      </div>

      <table className="transactions-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Price</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id}>
              <td>{t.title}</td>
              <td>${t.price}</td>
              <td>{t.category}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination Controls */}
      <div className="pagination">
        <button onClick={() => setPage(page - 1)} disabled={page === 1}>Previous</button>
        <span> Page {page} of {totalPages} </span>
        <button onClick={() => setPage(page + 1)} disabled={page >= totalPages}>Next</button>
      </div>

      <div className="bar-chart-container">
        <h2>Price Distribution</h2>
        <Bar data={{
          labels: Object.keys(barChartData),
          datasets: [{
            label: "Items",
            backgroundColor: "rgba(75, 192, 192, 0.5)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 1,
            data: Object.values(barChartData)
          }]
        }} />
      </div>
    </div>
  );
};

export default App;
