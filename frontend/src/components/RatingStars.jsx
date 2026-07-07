import React, { useState } from 'react';

export const RatingStars = ({ 
  rating = 0, 
  onRate = null,
  interactive = false,
  size = 1.5 
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  const displayRating = hoverRating || rating;

  return (
    <div className="rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`star ${star <= displayRating ? 'filled' : ''} ${
            interactive && star <= hoverRating ? 'hover' : ''
          }`}
          style={{ fontSize: `${size}rem` }}
          onClick={() => interactive && onRate && onRate(star)}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(0)}
        >
          ★
        </span>
      ))}
    </div>
  );
};
