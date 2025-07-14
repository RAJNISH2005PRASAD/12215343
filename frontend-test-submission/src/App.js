import React, { useState } from 'react';

function App() {
  const [inputs, setInputs] = useState([{ url: '', validity: '', shortcode: '' }]);
  const [results, setResults] = useState([]);
  const [errors, setErrors] = useState([]);
  const [stats, setStats] = useState([]);
  const [showStats, setShowStats] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (index, field, value) => {
    const newInputs = [...inputs];
    newInputs[index][field] = value;
    setInputs(newInputs);
  };
  const addInput = () => {
    if (inputs.length < 5) setInputs([...inputs, { url: '', validity: '', shortcode: '' }]);
  };
  const removeInput = (index) => {
    if (inputs.length > 1) setInputs(inputs.filter((_, i) => i !== index));
  };
  const validate = () => {
    const errs = inputs.map((input) => {
      if (!input.url) return 'Enter a URL.';
      if (input.validity && isNaN(Number(input.validity))) return 'Validity must be a number.';
      if (input.shortcode && !/^[a-zA-Z0-9]+$/.test(input.shortcode)) return 'Shortcode must be alphanumeric.';
      return '';
    });
    setErrors(errs);
    return errs.every((e) => !e);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const resArr = [];
    for (let i = 0; i < inputs.length; i++) {
      const body = { url: inputs[i].url };
      if (inputs[i].validity) body.validity = Number(inputs[i].validity);
      if (inputs[i].shortcode) body.shortcode = inputs[i].shortcode;
      try {
        const resp = await fetch('http://localhost:5000/shorturls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await resp.json();
        if (resp.status === 201) {
          resArr.push({ ...data, originalUrl: inputs[i].url, shortcode: body.shortcode || data.shortLink.split('/').pop() });
        } else {
          resArr.push({ error: data.error, originalUrl: inputs[i].url });
        }
      } catch {
        resArr.push({ error: 'Network error', originalUrl: inputs[i].url });
      }
    }
    setResults(resArr);
    setShowStats(false);
  };
  const fetchStats = async () => {
    setLoading(true);
    const statArr = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i].shortLink && results[i].shortcode) {
        try {
          const resp = await fetch(`http://localhost:5000/shorturls/${results[i].shortcode}`);
          const data = await resp.json();
          if (!data.error) {
            statArr.push({ ...data, shortLink: results[i].shortLink });
          } else {
            statArr.push({ shortLink: results[i].shortLink, totalClicks: 0, clicks: [], error: data.error });
          }
        } catch {
          statArr.push({ shortLink: results[i].shortLink, totalClicks: 0, clicks: [], error: 'Network error' });
        }
      }
    }
    setStats(statArr);
    setLoading(false);
    setShowStats(true);
  };
  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: 16 }}>
      <h2>URL Shortener</h2>
      <form onSubmit={handleSubmit}>
        {inputs.map((input, idx) => (
          <div key={idx} style={{ marginBottom: 8, border: '1px solid #ccc', padding: 8 }}>
            <div>
              <input placeholder="URL" value={input.url} onChange={e => handleInputChange(idx, 'url', e.target.value)} style={{ width: '60%' }} />
            </div>
            <div>
              <input placeholder="Validity (min)" value={input.validity} onChange={e => handleInputChange(idx, 'validity', e.target.value)} style={{ width: '30%', marginRight: 8 }} />
              <input placeholder="Shortcode" value={input.shortcode} onChange={e => handleInputChange(idx, 'shortcode', e.target.value)} style={{ width: '30%' }} />
            </div>
            <div>
              <button type="button" onClick={() => removeInput(idx)} disabled={inputs.length === 1}>Remove</button>
            </div>
            {errors[idx] && <div style={{ color: 'red', fontSize: 12 }}>{errors[idx]}</div>}
          </div>
        ))}
        <button type="button" onClick={addInput} disabled={inputs.length >= 5} style={{ marginRight: 8 }}>Add URL</button>
        <button type="submit">Shorten</button>
      </form>
      <div style={{ marginTop: 24 }}>
        <h3>Results</h3>
        {results.map((res, idx) => (
          <div key={idx} style={{ marginBottom: 8 }}>
            {res.error ? (
              <span style={{ color: 'red' }}>{res.originalUrl}: {res.error}</span>
            ) : (
              <span>{res.originalUrl}: {res.shortLink} (Expires: {res.expiry})</span>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 24 }}>
        <button onClick={fetchStats} disabled={results.length === 0}>Show Statistics</button>
        {showStats && (
          <div style={{ marginTop: 16 }}>
            <h3>Statistics</h3>
            {loading ? <div>Loading...</div> : (
              <div>
                {results.length === 0 && <div>No statistics available.</div>}
                {stats.map((stat, idx) => (
                  <div key={idx} style={{ border: '1px solid #ccc', marginBottom: 8, padding: 8 }}>
                    <div>{stat.shortLink}</div>
                    {stat.error && <div style={{ color: 'red' }}>{stat.error}</div>}
                    <div>Total Clicks: {stat.totalClicks}</div>
                    <div>Click Details:</div>
                    <ul>
                      {stat.clicks.length === 0 && <li>No clicks yet.</li>}
                      {stat.clicks.map((click, cidx) => (
                        <li key={cidx}>Time: {click.timestamp}, Referrer: {click.referrer || 'N/A'}, Location: {click.location}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
