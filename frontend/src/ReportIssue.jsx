import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './services/api'; 

function ReportIssue() {
  // 1. Pamięć podręczna na teksty i PLIK (zdjęcie)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null); // null, bo na start nie ma żadnego zdjęcia
  
  const navigate = useNavigate();

  // 2. Co się dzieje po kliknięciu "Wyślij zgłoszenie"
const handleSubmit = async (event) => {
    event.preventDefault(); 
    
    // --- TRYB DEMO: Omijamy niedziałający backend ---
    alert('Tryb demo: Usterka zgłoszona pomyślnie!');
    navigate('/'); // Sukces? Wracamy na główną mapę

    /* --- PRAWDZIWY KOD (schowany na później, aż koledzy naprawią serwer) ---
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    if (photo) {
      formData.append('photo', photo);
    }

    try {
      await api.post('/issues', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Zgłoszenie zostało pomyślnie wysłane!');
      navigate('/'); 
    } catch (error) {
      alert('Wystąpił błąd podczas wysyłania zgłoszenia.');
    }
    ------------------------------------------------------------------------ */
  };

  // 3. Wygląd formularza
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '50px' }}>
      <h2>Zgłoś usterkę drogową</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '350px' }}>
        <input 
          type="text" 
          placeholder="Krótki tytuł (np. Dziura w asfalcie)" 
          value={title}
          onChange={(e) => setTitle(e.target.value)} 
          required
        />
        
        <textarea 
          placeholder="Dokładny opis sytuacji..." 
          value={description}
          onChange={(e) => setDescription(e.target.value)} 
          rows="5"
          required
        />

        <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Dołącz zdjęcie dowodowe:</label>
        <input 
          type="file" 
          accept="image/*" // Pozwalamy tylko na pliki graficzne (np. jpg, png)
          onChange={(e) => setPhoto(e.target.files[0])} // Zapisujemy pierwszy wybrany plik
          required
        />

        <button type="submit" style={{ padding: '10px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>
          Wyślij zgłoszenie
        </button>
      </form>
    </div>
  );
}

export default ReportIssue;