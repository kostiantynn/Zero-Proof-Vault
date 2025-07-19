import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ManageVault from "./pages/ManageVault";

export default function App() {
  return (
    <Router>
      <div className="app">
        <header className="header">
          <div className="container">
            <div className="header-content">
              <div className="logo">🔐 Zero-Proof Password Manager</div>
              <nav>
                <a href="/" className="btn btn-secondary">Home</a>
              </nav>
            </div>
          </div>
        </header>
        
        <main className="main-content">
          <div className="container">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/manage" element={<ManageVault />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}