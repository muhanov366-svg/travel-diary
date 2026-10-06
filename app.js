var GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzjLRAndJ1RBEhaTVPxxKmtz1EVLDl7LD36dVGWsMq7hPqZ6sOq-o-OiYwwFZt-65u8/exec';
var PROXY_URL = '';

// ---- БАЗОВЫЕ ФУНКЦИИ ----
function getCurrentUser() {
    try {
        var user = localStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    } catch (e) {
        return null;
    }
}

function isLoggedIn() {
    return getCurrentUser() !== null;
}

function updateUserInfo() {
    var user = getCurrentUser();
    var display = document.getElementById('userDisplay');
    if (display) {
        display.textContent = user ? '👤 ' + user.name : '🔒 Гость';
    }
    
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.style.display = user ? 'inline-block' : 'none';
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    // Определяем правильный путь для редиректа
    var path = window.location.pathname;
    if (path.includes('/pages/')) {
        window.location.href = 'login.html';
    } else {
        window.location.href = 'pages/login.html';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ---- ФУНКЦИИ ДЛЯ РАБОТЫ С ИЗОБРАЖЕНИЯМИ ----

function normalizeImageUrl(url) {
    if (!url) return url;
    
    url = url.trim();
    
    if (url.includes('disk.yandex.ru')) {
        var match = url.match(/disk\.yandex\.ru\/(?:i|d)\/([a-zA-Z0-9_-]+)/);
        if (match) {
            return 'https://downloader.disk.yandex.ru/disk/' + match[1] + '?no_preview=1';
        }
        return url;
    }
    
    if (url.includes('cloud.mail.ru')) {
        if (!url.includes('?') && !url.includes('&')) {
            url = url + '?download=1';
        }
        return url;
    }
    
    if (url.includes('drive.google.com')) {
        var match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match) {
            return 'https://drive.google.com/uc?export=view&id=' + match[1];
        }
        match = url.match(/id=([a-zA-Z0-9_-]+)/);
        if (match) {
            return 'https://drive.google.com/uc?export=view&id=' + match[1];
        }
        return url;
    }
    
    if (url.includes('dropbox.com')) {
        return url.replace('?dl=0', '?raw=1').replace('&dl=0', '&raw=1');
    }
    
    return url;
}

function handleImageError(img) {
    var url = img.getAttribute('data-fallback');
    if (url && !img.hasAttribute('data-fallback-used')) {
        img.setAttribute('data-fallback-used', 'true');
        img.src = url;
        return;
    }
    
    img.style.display = 'none';
    var container = img.parentElement;
    if (container) {
        var placeholder = document.createElement('div');
        placeholder.className = 'photo-placeholder';
        placeholder.textContent = '🖼️';
        placeholder.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#e2e8f0;font-size:48px;';
        container.appendChild(placeholder);
    }
    console.warn('Не удалось загрузить изображение:', img.src);
}

// ---- ФУНКЦИИ ДЛЯ РАБОТЫ С API ----

function callApi(action, data) {
    if (data === undefined) data = {};
    
    return new Promise(function(resolve, reject) {
        var params = new URLSearchParams();
        params.append('action', action);
        
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                params.append(key, data[key]);
            }
        }
        params.append('_t', Date.now());
        
        var fullUrl = GOOGLE_SCRIPT_URL + '?' + params.toString();
        var url = PROXY_URL ? PROXY_URL + fullUrl : fullUrl;
        
        console.log('Запрос:', action, 'URL:', url);
        
        fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            mode: 'cors'
        })
        .then(function(response) {
            if (!response.ok) {
                throw new Error('HTTP ошибка: ' + response.status);
            }
            return response.json();
        })
        .then(function(data) {
            console.log('Ответ:', data);
            if (data.success === false) {
                reject(data.message || 'Произошла ошибка');
            } else {
                resolve(data);
            }
        })
        .catch(function(error) {
            console.error('Ошибка:', error);
            reject('Ошибка: ' + error.message);
        });
    });
}

// ---- ФУНКЦИИ АВТОРИЗАЦИИ ----

function registerUser(name, email, password) {
    return callApi('registerUser', { name: name, email: email, password: password });
}

function loginUser(email, password) {
    return callApi('loginUser', { email: email, password: password });
}

// ---- ФУНКЦИИ ДЛЯ РАБОТЫ С ПУТЕШЕСТВИЯМИ ----

function getAllTravels() {
    return callApi('getAllTravels', {});
}

function getTravelsByUser(userId) {
    return callApi('getTravelsByUser', { userId: userId });
}

function createTravel(userId, title, description, startDate, endDate, cost, location) {
    return callApi('createTravel', { 
        userId: userId,
        title: title,
        description: description,
        startDate: startDate,
        endDate: endDate,
        cost: cost,
        location: location
    });
}

function deleteTravel(travelId, userId) {
    return callApi('deleteTravel', { 
        travelId: travelId,
        userId: userId
    });
}

function addPhoto(travelId, url) {
    return callApi('addPhoto', { travelId: travelId, url: url });
}

function getPhotosByTravel(travelId) {
    return callApi('getPhotosByTravel', { travelId: travelId });
}

// ---- TOAST УВЕДОМЛЕНИЯ ----

function showToast(message, type) {
    var existing = document.querySelector('.toast-container');
    if (!existing) {
        var container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    var toast = document.createElement('div');
    toast.className = 'toast ' + (type === 'success' ? 'toast-success' : 'toast-error');
    toast.textContent = message;
    
    var container = document.querySelector('.toast-container');
    container.appendChild(toast);
    
    setTimeout(function() {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(function() {
        toast.classList.remove('show');
        setTimeout(function() {
            toast.remove();
            if (container.children.length === 0) {
                container.remove();
            }
        }, 300);
    }, 3000);
}

// ---- ФУНКЦИЯ УДАЛЕНИЯ ПУТЕШЕСТВИЯ ----

function handleDeleteTravel(travelId, userId, btnElement) {
    var card = btnElement.closest('.travel-card');
    if (card) {
        card.classList.add('deleting');
        card.style.opacity = '0.5';
        card.style.transform = 'scale(0.95)';
    }
    
    deleteTravel(travelId, userId)
        .then(function(response) {
            if (response.success) {
                if (card) {
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.8)';
                    setTimeout(function() {
                        card.remove();
                        var feed = document.getElementById('travelFeed');
                        if (feed && feed.children.length === 0) {
                            feed.innerHTML = '<p class="loading">Пока нет ни одного путешествия. Создайте первое!</p>';
                        }
                    }, 300);
                }
                showToast('Путешествие успешно удалено!', 'success');
            } else {
                if (card) {
                    card.classList.remove('deleting');
                    card.style.opacity = '1';
                    card.style.transform = 'scale(1)';
                }
                showToast('Ошибка удаления: ' + (response.message || 'Неизвестная ошибка'), 'error');
            }
        })
        .catch(function(error) {
            if (card) {
                card.classList.remove('deleting');
                card.style.opacity = '1';
                card.style.transform = 'scale(1)';
            }
            showToast('Ошибка: ' + error, 'error');
        });
}

// ---- ФУНКЦИИ ЗАГРУЗКИ КОНТЕНТА ----

function loadTravelFeed() {
    var feed = document.getElementById('travelFeed');
    if (!feed) return;
    
    feed.innerHTML = '<p class="loading">Загрузка...</p>';
    
    getAllTravels()
        .then(function(response) {
            var travels = response.data || [];
            if (travels.length === 0) {
                feed.innerHTML = '<p class="loading">Пока нет ни одного путешествия. Создайте первое!</p>';
                return;
            }
            
            var currentUser = getCurrentUser();
            var html = '';
            for (var i = 0; i < travels.length; i++) {
                var travel = travels[i];
                var title = escapeHtml(travel.title || 'Без названия');
                var description = escapeHtml(travel.description || '');
                var startDate = escapeHtml(travel.start_date || 'не указана');
                var endDate = escapeHtml(travel.end_date || 'не указана');
                var cost = escapeHtml(travel.cost || 'не указана');
                var isOwner = currentUser && travel.user_id == currentUser.id;
                
                html += '<div class="travel-card" data-id="' + travel.id + '">';
                html += '<div class="card-content">';
                html += '<h3 class="card-title">' + title + '</h3>';
                html += '<p class="card-description">' + description + '</p>';
                html += '<p class="card-dates">📅 ' + startDate + ' — ' + endDate + '</p>';
                html += '<p class="card-cost">💰 ' + cost + ' ₽</p>';
                html += '<div class="card-actions">';
                html += '<a href="pages/travel.html?id=' + travel.id + '" class="card-link">Подробнее →</a>';
                if (isOwner) {
                    html += '<button class="btn-delete" data-id="' + travel.id + '" data-user="' + currentUser.id + '">🗑️ Удалить</button>';
                }
                html += '</div></div></div>';
            }
            
            feed.innerHTML = html;
            
            var deleteBtns = feed.querySelectorAll('.btn-delete');
            for (var j = 0; j < deleteBtns.length; j++) {
                deleteBtns[j].addEventListener('click', function(e) {
                    var btn = e.target;
                    var travelId = btn.getAttribute('data-id');
                    var userId = btn.getAttribute('data-user');
                    if (confirm('🗑️ Вы уверены, что хотите удалить это путешествие?')) {
                        handleDeleteTravel(travelId, userId, btn);
                    }
                });
            }
        })
        .catch(function(error) {
            feed.innerHTML = '<p class="loading">❌ Ошибка загрузки: ' + escapeHtml(error) + '</p>';
        });
}

function loadUserTravels() {
    var container = document.getElementById('userTravels');
    if (!container) return;
    
    var user = getCurrentUser();
    if (!user) {
        container.innerHTML = '<p class="loading">Пожалуйста, войдите в систему</p>';
        return;
    }
    
    container.innerHTML = '<p class="loading">Загрузка...</p>';
    
    getTravelsByUser(user.id)
        .then(function(response) {
            var travels = response.data || [];
            if (travels.length === 0) {
                container.innerHTML = '<p class="loading">У вас пока нет путешествий. Создайте первое!</p>';
                return;
            }
            
            var html = '<div class="travel-grid">';
            for (var i = 0; i < travels.length; i++) {
                var travel = travels[i];
                var title = escapeHtml(travel.title || 'Без названия');
                var description = escapeHtml(travel.description || '');
                var startDate = escapeHtml(travel.start_date || 'не указана');
                var endDate = escapeHtml(travel.end_date || 'не указана');
                var cost = escapeHtml(travel.cost || 'не указана');
                
                html += '<div class="travel-card" data-id="' + travel.id + '">';
                html += '<div class="card-content">';
                html += '<h3 class="card-title">' + title + '</h3>';
                html += '<p class="card-description">' + description + '</p>';
                html += '<p class="card-dates">📅 ' + startDate + ' — ' + endDate + '</p>';
                html += '<p class="card-cost">💰 ' + cost + ' ₽</p>';
                html += '<div class="card-actions">';
                html += '<a href="travel.html?id=' + travel.id + '" class="card-link">Подробнее →</a>';
                html += '<button class="btn-delete" data-id="' + travel.id + '" data-user="' + user.id + '">🗑️ Удалить</button>';
                html += '</div></div></div>';
            }
            html += '</div>';
            container.innerHTML = html;
            
            var deleteBtns = container.querySelectorAll('.btn-delete');
            for (var j = 0; j < deleteBtns.length; j++) {
                deleteBtns[j].addEventListener('click', function(e) {
                    var btn = e.target;
                    var travelId = btn.getAttribute('data-id');
                    var userId = btn.getAttribute('data-user');
                    if (confirm('🗑️ Вы уверены, что хотите удалить это путешествие?')) {
                        handleDeleteTravel(travelId, userId, btn);
                    }
                });
            }
        })
        .catch(function(error) {
            container.innerHTML = '<p class="loading">❌ Ошибка: ' + escapeHtml(error) + '</p>';
        });
}

function loadTravelDetails(travelId) {
    var container = document.getElementById('travelDetails');
    if (!container) return;
    
    container.innerHTML = '<p class="loading">Загрузка...</p>';
    
    getAllTravels()
        .then(function(response) {
            var travels = response.data || [];
            var travel = null;
            for (var i = 0; i < travels.length; i++) {
                if (travels[i].id == travelId) {
                    travel = travels[i];
                    break;
                }
            }
            
            if (!travel) {
                container.innerHTML = '<p class="loading">Путешествие не найдено</p>';
                return;
            }
            
            return getPhotosByTravel(travelId).then(function(photoResponse) {
                var photos = photoResponse.data || [];
                return { travel: travel, photos: photos };
            });
        })
        .then(function(result) {
            if (!result) return;
            
            var travel = result.travel;
            var photos = result.photos;
            var currentUser = getCurrentUser();
            var isOwner = currentUser && travel.user_id == currentUser.id;
            
            var title = escapeHtml(travel.title || 'Без названия');
            var description = escapeHtml(travel.description || 'Описание отсутствует');
            var startDate = escapeHtml(travel.start_date || 'не указана');
            var endDate = escapeHtml(travel.end_date || 'не указана');
            var cost = escapeHtml(travel.cost || 'не указана');
            var location = escapeHtml(travel.location || 'не указано');
            
            var html = '<div class="travel-detail-card">';
            html += '<div class="travel-detail-header">';
            html += '<h2>' + title + '</h2>';
            if (isOwner) {
                html += '<button class="btn-delete-large" data-id="' + travel.id + '" data-user="' + currentUser.id + '">🗑️ Удалить путешествие</button>';
            }
            html += '</div>';
            html += '<p class="travel-detail-description">' + description + '</p>';
            html += '<div class="travel-detail-info">';
            html += '<p><span class="info-icon">📅</span> <strong>Даты:</strong> ' + startDate + ' — ' + endDate + '</p>';
            html += '<p><span class="info-icon">💰</span> <strong>Стоимость:</strong> ' + cost + ' ₽</p>';
            html += '<p><span class="info-icon">📍</span> <strong>Местоположение:</strong> ' + location + '</p>';
            html += '</div></div>';
            
            if (photos && photos.length > 0) {
                html += '<h3 class="photos-title">📸 Фотографии</h3>';
                html += '<div class="photos-grid">';
                
                for (var i = 0; i < photos.length; i++) {
                    var originalUrl = photos[i];
                    var normalizedUrl = normalizeImageUrl(originalUrl);
                    
                    html += '<div class="photo-item" onclick="window.open(\'' + originalUrl + '\', \'_blank\')">';
                    html += '<img src="' + normalizedUrl + '" ';
                    html += 'onerror="handleImageError(this)" ';
                    html += 'alt="Фото ' + (i+1) + '" ';
                    html += 'crossorigin="anonymous" ';
                    html += 'loading="lazy">';
                    html += '<div class="photo-overlay"><span>🔍</span></div>';
                    html += '</div>';
                }
                html += '</div>';
            }
            
            container.innerHTML = html;
            
            var deleteBtn = container.querySelector('.btn-delete-large');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function(e) {
                    var btn = e.target;
                    var travelId = btn.getAttribute('data-id');
                    var userId = btn.getAttribute('data-user');
                    if (confirm('🗑️ Вы уверены, что хотите удалить это путешествие?')) {
                        deleteTravel(travelId, userId)
                            .then(function(response) {
                                if (response.success) {
                                    showToast('Путешествие удалено!', 'success');
                                    setTimeout(function() {
                                        window.location.href = '../index.html';
                                    }, 1500);
                                } else {
                                    showToast('Ошибка удаления: ' + (response.message || 'Неизвестная ошибка'), 'error');
                                }
                            })
                            .catch(function(error) {
                                showToast('Ошибка: ' + error, 'error');
                            });
                    }
                });
            }
        })
        .catch(function(error) {
            container.innerHTML = '<p class="loading">❌ Ошибка: ' + escapeHtml(error) + '</p>';
        });
}

function requireAuth() {
    if (!isLoggedIn()) {
        var path = window.location.pathname;
        if (path.includes('/pages/')) {
            window.location.href = 'login.html';
        } else {
            window.location.href = 'pages/login.html';
        }
        return false;
    }
    return true;
}

// ---- ИНИЦИАЛИЗАЦИЯ ----

document.addEventListener('DOMContentLoaded', function() {
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    updateUserInfo();
});

console.log('app.js загружен!');
console.log('URL Google Script:', GOOGLE_SCRIPT_URL);
