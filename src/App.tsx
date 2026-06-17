import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import OptometryList from '@/pages/OptometryList';
import OptometryNew from '@/pages/OptometryNew';
import Inventory from '@/pages/Inventory';
import Customers from '@/pages/Customers';
import Statistics from '@/pages/Statistics';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/optometry" element={<OptometryList />} />
          <Route path="/optometry/new" element={<OptometryNew />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<Customers />} />
          <Route path="/statistics" element={<Statistics />} />
        </Route>
      </Routes>
    </Router>
  );
}
