import { useState, useEffect, useCallback } from 'react';
import './styles/variables.css';
import './styles/App.css';

const STATUS = {
  BLOCKED: 'Blocked',
  UNBLOCKED: 'Unblocked'
};

function App() {
  const [count, setCount] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [isBlocked, setIsBlocked] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let timer;

    if(isBlocked == false) {
    const init = async () => {
    console.log('Initializing timer...');

      try {

        timer = setInterval(() => {
          setCount(prev => {
            if (prev > 0) {
              return prev - 1;
            } 
            else {
              setIsBlocked(true);
              clearInterval(timer);
              console.log('Time is up, blocking now...');
              window.api.block();
              return 0;
            }
          });

        }, 1000);
      } catch (err) {
        setError('Failed to initialize timer');
        console.error(err);
      }
    };
    init();
  }
    return () => clearInterval(timer);
  }, [isBlocked]);

  useEffect(() => {
    const fetchQuestions = async () => {
        const initial = await window.api.getTimeLeft();
        setCount(initial);
      try {
        const fetched = await window.api.getQuestions();
        setQuestions(fetched);
        console.log('Fetched questions:', fetched);
      } catch (err) {
        setError('Failed to fetch questions');
        console.error(err);
      }
    };
    fetchQuestions();
  }, []);

  const handleBlock = useCallback(async () => {
    if (count >= 0) {
      setError('Cannot block while time is left');
      return;
    }
    try {
      await window.api.block();
      setIsBlocked(true);
    } catch (err) {
      setError('Failed to block');
      console.error(err);
    }
  }, []);

  const handleUnblock = useCallback(async () => {
    console.log(count)
    if (await window.api.getTimeLeft() <= 0) {
      setError('Not enough time left to unblock');
      return;
    }
    try {
      await window.api.unblock();
      setIsBlocked(false);
    } catch (err) {
      setError('Failed to unblock');
      console.error(err);
    }
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="app">
      {error && <div className="alert alert-error">{error}</div>}

      <div className="status">
        Status: <span className={isBlocked ? 'blocked' : 'unblocked'}>
          {isBlocked ? STATUS.BLOCKED : STATUS.UNBLOCKED}
        </span>
      </div>

      <div className="content">
        <div className="questions">
          <h2 className="section-title">Questions</h2>
          {questions.length > 0 ? (
            <ul>
              {questions.map((q, idx) => (
                <li key={q.id || idx}>{q.text || q}</li>
              ))}
            </ul>
          ) : (
            <p className="placeholder">No questions available</p>
          )}
        </div>

        <div className="timer">
          <h2 className="section-title">Timer</h2>
          <div className="time-display">{formatTime(count)}</div>
          <div className="buttons">
            <button
              onClick={handleBlock}
              disabled={isBlocked}
              className="btn btn-block"
            >
              Block
            </button>
            <button
              onClick={handleUnblock}
              disabled={!isBlocked}
              className="btn btn-unblock"
            >
              Unblock
            </button>
              <button
              onClick={() => {
                window.api.reset();
              }}
              className="btn btn-reset"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
