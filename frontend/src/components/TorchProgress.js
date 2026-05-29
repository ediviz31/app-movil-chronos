/**
 * TorchProgress — Barra de progreso estilo antorcha.
 * Muestra una llama que avanza con el porcentaje de carga.
 * Usado durante la subida de videos y crónicas con multimedia.
 */
import React from 'react';

const TorchProgress = ({ progress = 0, label = 'Encendiendo la antorcha…' }) => {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  const isComplete = pct >= 100;

  return (
    <div className="torch-progress" data-testid="torch-progress" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100">
      <div className="torch-progress-label">
        <span className="torch-progress-label-text">{isComplete ? 'Sellando en el archivo…' : label}</span>
        <span className="torch-progress-pct">{pct}%</span>
      </div>
      <div className="torch-progress-track">
        <div className="torch-progress-fill" style={{ width: `${pct}%` }}>
          <span className="torch-progress-flame" aria-hidden="true">
            <span className="flame-core" />
            <span className="flame-glow" />
            <span className="flame-spark" />
          </span>
        </div>
      </div>
    </div>
  );
};

export default TorchProgress;
