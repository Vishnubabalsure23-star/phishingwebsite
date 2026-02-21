import { AppProvider } from "@/contexts/AppContext";
import Index from "./pages/Index";

const App = () => (
  <AppProvider>
    <Index />
  </AppProvider>
);

export default App;
