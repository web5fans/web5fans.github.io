import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Home } from "@/pages/Home";
import { WalletProvider } from "@/provider/WalletProvider";

export default function App() {
  const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const net = (search.get('net') || 'testnet').toLowerCase();
  const network = net === 'mainnet' ? 'mainnet' : 'testnet';
  return (
    <WalletProvider network={network as 'mainnet' | 'testnet'}>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </Router>
    </WalletProvider>
  );
}
