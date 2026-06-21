import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// import api from './services/api'; // Odkomentujesz, gdy backend ruszy!

function IssueList() {
  // 1. Pamięć na listę usterek i status ładowania
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 2. Pobieranie danych automatycznie po wejściu na stronę
  useEffect(() => {
    const fetchIssues = async () => {
      try {
        // --- TRYB DEMO ---
        // Sztucznie opóźniamy o pół sekundy, żeby zasymulować zapytanie do serwera
        setTimeout(() => {
          setIssues([
            { id: 1, title: 'Wielka dziura w asfalcie', description: 'Głęboka wyrwa na prawym pasie.', status: 'Nowe' },
            { id: 2, title: 'Niedziałająca sygnalizacja', description: 'Światła na skrzyżowaniu migają na żółto od wczoraj.', status: 'W trakcie' },
            { id: 3, title: 'Brak znaku STOP', description: 'Znak został powalony i leży w rowie.', status: 'Zakończone' }
          ]);
          setLoading(false); // Kończymy ładowanie
        }, 500);

        /* --- PRAWDZIWY KOD (do odblokowania, gdy naprawią serwer) ---
        // Używamy metody GET, żeby pobrać (a nie wysłać) dane!
        const response = await api.get('/issues');
        setIssues(response.data); 
        setLoading(false);
        --------------------------------------------------------------- */
      } catch (error) {
        alert('Nie udało się pobrać listy zgłoszeń.');
        setLoading(false);
      }
    };

    fetchIssues(); // Odpalamy funkcję pobierającą
  }, []); // Puste nawiasy [] oznaczają: "uruchom to tylko raz, przy starcie"

  // 3. Wygląd listy (renderowanie)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      <h2>Baza zgłoszonych usterek</h2>
      
      <button 
        onClick={() => navigate('/mapa')} 
        style={{ marginBottom: '20px', padding: '10px 15px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px' }}
      >
        Wróć do mapy
      </button>

      {/* Jeśli loading = true, pokaż napis. Jeśli false, pokaż listę. */}
      {loading ? (
        <p>Pobieranie danych z systemu...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', maxWidth: '600px' }}>
          
          {/* Przechodzimy pętlą (.map) po wszystkich usterkach z bazy i tworzymy dla nich kafelki */}
          {issues.map((issue) => (
            <div key={issue.id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>{issue.title}</h3>
              <p style={{ margin: '0 0 10px 0', color: '#555' }}>{issue.description}</p>
              <span style={{ 
                display: 'inline-block', 
                padding: '5px 10px', 
                backgroundColor: issue.status === 'Nowe' ? '#dc3545' : (issue.status === 'W trakcie' ? '#ffc107' : '#198754'), 
                color: issue.status === 'W trakcie' ? 'black' : 'white', 
                borderRadius: '15px', 
                fontSize: '12px',
                fontWeight: 'bold' 
              }}>
                {issue.status}
              </span>
            </div>
          ))}

        </div>
      )}
    </div>
  );
}

export default IssueList;