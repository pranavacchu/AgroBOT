import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css'
import './globals.css'
import Home from './page'
import Dashboard from './components/Dashboard'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  )
}

export default App
