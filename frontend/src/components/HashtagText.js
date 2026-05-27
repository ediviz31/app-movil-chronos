import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Convierte texto con #hashtags en spans clickeables.
 * Conserva el resto del texto intacto.
 */
const HashtagText = ({ text, className = '' }) => {
  const navigate = useNavigate();
  if (!text) return null;

  // Regex que captura #palabra (con soporte para caracteres acentuados/_)
  const parts = text.split(/(#[\p{L}\p{N}_]{2,30})/gu);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith('#')) {
          const tag = part.slice(1).toLowerCase();
          return (
            <span
              key={i}
              className="hashtag"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/tags/${encodeURIComponent(tag)}`);
              }}
              data-testid={`hashtag-${tag}`}
            >
              {part}
            </span>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </span>
  );
};

export default HashtagText;
