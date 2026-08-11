import { getInitialData } from './data/initialData.js';
import PortfolioRenderer from './components/public/PortfolioRenderer.jsx';
import './styles/global.css';

export default function App() {
  const data = getInitialData();
  return <PortfolioRenderer sections={data.sections} theme={data.theme} />;
}
