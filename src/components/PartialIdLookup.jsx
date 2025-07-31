import React, { useState, useEffect } from 'react';

const PartialIdLookup = ({ onStaffSelected }) => {
  const [partialId, setPartialId] = useState('');
  const [staff, setStaff] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Clear staff/error if input not exactly 3 digits
    if (partialId.length !== 3) {
      setStaff(null);
      setError(null);
      if (onStaffSelected) onStaffSelected(null);
      return;
    }

    // Fetch full staff details from backend based on last 3 digits (partialId)
    const fetchStaff = async () => {
      try {
        setError(null);

        // Adjust URL if your frontend and backend ports differ or use proxy
        const response = await fetch(`/api/staffs/search/${partialId}`);

        if (!response.ok) {
          const data = await response.json();
          setStaff(null);
          setError(data.error || 'Staff not found');
          if (onStaffSelected) onStaffSelected(null);
          return;
        }

        const data = await response.json();
        setStaff(data);
        if (onStaffSelected) onStaffSelected(data);
      } catch (err) {
        setStaff(null);
        setError('Error fetching staff');
        if (onStaffSelected) onStaffSelected(null);
      }
    };

    fetchStaff();
  }, [partialId, onStaffSelected]);

  // Handle user input — numeric only, max 3 digits
  const handleInputChange = (e) => {
    const input = e.target.value.replace(/\D/g, '').slice(0, 3);
    setPartialId(input);
  };

  return (
    <div>
      <label htmlFor="partial-id-input" style={{ fontWeight: 'bold' }}>
        Enter last 3 digits of Employee ID:
      </label>
      <br />
      <input
        id="partial-id-input"
        type="text"
        value={partialId}
        onChange={handleInputChange}
        maxLength={3}
        placeholder="e.g. 003"
        autoComplete="off"
        style={{ padding: '8px', fontSize: '1rem', marginTop: '4px' }}
        aria-label="Enter last 3 digits of employee ID"
      />
      {error && (
        <div style={{ color: 'red', marginTop: '6px', fontWeight: 'bold' }}>
          {error}
        </div>
      )}
      {staff && (
        <div style={{ marginTop: '12px' }}>
          <strong>Employee Found:</strong>
          <br />
          Name: {staff.name}
          <br />
          Full ID: {staff.id}
        </div>
      )}
    </div>
  );
};

export default PartialIdLookup;
