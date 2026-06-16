import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { Dashboard, Signals, Pipeline, Buyers, Tasks, AITools } from "./pages/index";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index         element={<Dashboard />} />
        <Route path="signals"  element={<Signals />}  />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="buyers"   element={<Buyers />}   />
        <Route path="tasks"    element={<Tasks />}    />
        <Route path="ai"       element={<AITools />}  />
      </Route>
    </Routes>
  );
}
