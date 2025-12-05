import { Container } from '@mui/material';
import Leaderboard from './components/Leaderboard';

function App() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Leaderboard />
    </Container>
  );
}

export default App;
