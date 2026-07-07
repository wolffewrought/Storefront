import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { useCart } from '../hooks/useCart';
import { useAuthContext } from '../context/AuthContext';
import { products as productsApi, reviews as reviewsApi } from '../services/api';
import { RatingStars } from '../components/RatingStars';
import { Modal } from '../components/Modal';

export const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { user } = useAuthContext();
  const [quantity, setQuantity] = useState(1);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const { data: product, loading, error, refetch } = useFetch(() =>
    productsApi.get(id)
  );

  const handleAddToCart = () => {
    if (product) {
      addItem({
        id: product.data.id,
        name: product.data.name,
        price: product.data.price,
      }, quantity);
      navigate('/cart');
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setSubmittingReview(true);
    try {
      await reviewsApi.create(id, {
        rating: reviewRating,
        reviewText: reviewText,
      });
      setShowReviewModal(false);
      setReviewRating(5);
      setReviewText('');
      refetch();
    } catch (error) {
      alert(error.error || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-center" style={{ minHeight: '600px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          {error || 'Product not found'}
        </div>
      </div>
    );
  }

  const p = product.data;
  const images = p.images || [];
  const videos = p.videos || [];
  const files = p.files || [];
  const reviews = p.reviews || [];
  const currentImage = images[activeImageIndex];

  return (
    <div className="product-detail-page">
      <div className="container mt-4">
        <div className="product-detail-grid">
          {/* Images */}
          <div className="product-images">
            {currentImage && (
              <div className="main-image">
                <img src={currentImage.image_url} alt={p.name} />
              </div>
            )}

            {images.length > 1 && (
              <div className="image-thumbnails">
                {images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img.image_url}
                    alt={`${p.name} ${idx}`}
                    className={activeImageIndex === idx ? 'active' : ''}
                    onClick={() => setActiveImageIndex(idx)}
                  />
                ))}
              </div>
            )}

            {/* Videos */}
            {videos.length > 0 && (
              <div className="product-videos mt-3">
                <h5>Videos</h5>
                {videos.map((vid) => (
                  <a key={vid.id} href={vid.video_url} target="_blank" rel="noreferrer">
                    Watch video
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="product-info">
            <h1>{p.name}</h1>

            <div className="product-meta">
              {p.modeller_name && <p className="text-muted">By {p.modeller_name}</p>}
              {p.ip_name && <p className="text-muted">IP: {p.ip_name}</p>}
            </div>

            {/* Rating */}
            <div className="rating-section">
              <div className="flex flex-between">
                <div>
                  <RatingStars rating={p.average_rating || 0} size={1.3} />
                  <p className="text-muted">({p.total_ratings || 0} reviews)</p>
                </div>
                <p>{p.download_count || 0} downloads</p>
              </div>
            </div>

            <hr style={{ margin: '1.5rem 0' }} />

            {/* Price & Stock */}
            <div className="price-section">
              <h2 className="price">£{parseFloat(p.price).toFixed(2)}</h2>

              {p.stock_count !== null && (
                <p className={p.stock_count > 0 ? 'text-success' : 'text-danger'}>
                  {p.stock_count > 0 ? `${p.stock_count} in stock` : 'Out of stock'}
                </p>
              )}
              {p.stock_count === null && (
                <p className="text-success">Print on demand</p>
              )}
            </div>

            {/* Add to cart */}
            <div className="add-to-cart-section">
              <div className="quantity-selector">
                <label>Quantity:</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleAddToCart}
                style={{ width: '100%' }}
              >
                Add to Cart
              </button>
            </div>

            <hr style={{ margin: '1.5rem 0' }} />

            {/* Description */}
            {p.description && (
              <div className="description">
                <h4>Description</h4>
                <p>{p.description}</p>
              </div>
            )}

            {/* Files */}
            {files.length > 0 && (
              <div className="files-section">
                <h4>Available Files</h4>
                <ul>
                  {files.map((file) => (
                    <li key={file.id}>
                      <a href={file.file_url} target="_blank" rel="noreferrer">
                        {file.file_name} ({file.file_type})
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Reviews */}
        <div className="reviews-section mt-4">
          <div className="flex flex-between mb-3">
            <h3>Reviews</h3>
            <button
              className="btn btn-primary btn-small"
              onClick={() => setShowReviewModal(true)}
            >
              Write Review
            </button>
          </div>

          {reviews.length === 0 ? (
            <p className="text-muted">No reviews yet.</p>
          ) : (
            <div className="reviews-list">
              {reviews.map((review) => (
                <div key={review.id} className="review-item card">
                  <div className="review-header">
                    <div>
                      <strong>{review.username}</strong>
                      <RatingStars rating={review.rating} size={1} />
                    </div>
                    <small className="text-muted">
                      {new Date(review.created_at).toLocaleDateString()}
                    </small>
                  </div>
                  {review.review_text && <p>{review.review_text}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={showReviewModal}
        title="Write a Review"
        onClose={() => setShowReviewModal(false)}
        footer={
          <div className="flex gap-2">
            <button
              className="btn btn-secondary"
              onClick={() => setShowReviewModal(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmitReview}
              disabled={submittingReview}
            >
              Submit
            </button>
          </div>
        }
      >
        <div className="form-group">
          <label>Rating</label>
          <RatingStars
            rating={reviewRating}
            onRate={setReviewRating}
            interactive={true}
            size={2}
          />
        </div>
        <div className="form-group">
          <label>Review (optional)</label>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share your thoughts..."
          />
        </div>
      </Modal>
    </div>
  );
};

const styles = `
  .product-detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3rem;
    margin: 2rem 0;
  }

  .product-images {
    display: flex;
    flex-direction: column;
  }

  .main-image {
    width: 100%;
    aspect-ratio: 1;
    background: var(--light);
    border-radius: var(--border-radius);
    overflow: hidden;
    margin-bottom: 1rem;
  }

  .main-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .image-thumbnails {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
  }

  .image-thumbnails img {
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: var(--border-radius);
    cursor: pointer;
    border: 2px solid transparent;
    transition: border-color 0.2s;
  }

  .image-thumbnails img.active {
    border-color: var(--primary);
  }

  .product-videos {
    padding-top: 1rem;
    border-top: 1px solid #e0e0e0;
  }

  .product-videos a {
    display: block;
    margin-bottom: 0.5rem;
  }

  .product-info h1 {
    margin-bottom: 1rem;
  }

  .product-meta {
    margin-bottom: 1.5rem;
  }

  .rating-section {
    margin: 1.5rem 0;
    padding: 1rem 0;
    border-top: 1px solid #e0e0e0;
    border-bottom: 1px solid #e0e0e0;
  }

  .price {
    color: var(--primary);
    margin: 1rem 0;
  }

  .quantity-selector {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .quantity-selector input {
    width: 80px;
  }

  .files-section ul {
    list-style: none;
    padding: 0;
  }

  .files-section li {
    padding: 0.5rem 0;
    border-bottom: 1px solid #e0e0e0;
  }

  .files-section a {
    color: var(--primary);
  }

  .reviews-section {
    padding: 2rem 0;
    border-top: 1px solid #e0e0e0;
  }

  .reviews-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .review-item {
    padding: 1.5rem;
  }

  .review-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .review-header strong {
    display: block;
    margin-bottom: 0.5rem;
  }

  @media (max-width: 768px) {
    .product-detail-grid {
      grid-template-columns: 1fr;
      gap: 2rem;
    }

    .image-thumbnails {
      grid-template-columns: repeat(3, 1fr);
    }
  }
`;

const style = document.createElement('style');
style.innerHTML = styles;
document.head.appendChild(style);
