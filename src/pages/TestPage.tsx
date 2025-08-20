import React, { useState } from 'react';
import { callTestFunction } from '../services/testService';
import { Box, Button, Container, TextField, Typography, Paper, CircularProgress } from '@mui/material';

const TestPage: React.FC = () => {
  const [inputData, setInputData] = useState('{"test": "Hello, world!"}');
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Parse the input data as JSON
      const data = JSON.parse(inputData);
      
      // Call the test function
      const result = await callTestFunction(data);
      
      // Set the response
      setResponse(result);
    } catch (err) {
      console.error('Test error:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Firebase Function Test
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Test Input (JSON)
        </Typography>
        
        <TextField
          fullWidth
          multiline
          rows={4}
          variant="outlined"
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          sx={{ mb: 2 }}
        />
        
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleTest}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {loading ? 'Testing...' : 'Test Function'}
        </Button>
      </Paper>
      
      {error && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: '#ffebee' }}>
          <Typography variant="h6" color="error" gutterBottom>
            Error
          </Typography>
          <Typography variant="body1">
            {error}
          </Typography>
        </Paper>
      )}
      
      {response && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Response
          </Typography>
          <Typography variant="body1" component="pre" sx={{ 
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-word',
            bgcolor: '#f5f5f5',
            p: 2,
            borderRadius: 1
          }}>
            {response}
          </Typography>
        </Paper>
      )}
    </Container>
  );
};

export default TestPage;