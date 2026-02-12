/*
	Phantom by HTML5 UP
	html5up.net | @ajlkn
	Free for personal and commercial use under the CCA 3.0 license (html5up.net/license)
*/
(function initDarkMode() {
	document.body.classList.add('dark-mode');
})();

(function initCustomCursor() {
	if (!window.matchMedia || !window.matchMedia('(pointer: fine)').matches)
		return;

	var body = document.body;
	var dot = document.createElement('div');
	var x = 0;
	var y = 0;
	var rafId = null;

	dot.id = 'cursor-dot';
	dot.setAttribute('aria-hidden', 'true');
	body.appendChild(dot);
	body.classList.add('custom-cursor');

	var draw = function() {
		dot.style.left = x + 'px';
		dot.style.top = y + 'px';
		rafId = null;
	};

	var handleMove = function(event) {
		x = event.clientX;
		y = event.clientY;
		body.classList.add('cursor-active');

		if (!rafId)
			rafId = window.requestAnimationFrame(draw);
	};

	if (window.PointerEvent)
		window.addEventListener('pointermove', handleMove, { passive: true });
	else
		window.addEventListener('mousemove', handleMove, { passive: true });

	window.addEventListener('mouseout', function(event) {
		if (!event.relatedTarget)
			body.classList.remove('cursor-active');
	});

	window.addEventListener('blur', function() {
		body.classList.remove('cursor-active');
	});
})();

(function initSkillsLab() {
	var lab = document.getElementById('skillsLab');
	if (!lab)
		return;
	lab.classList.add('is-primed');

	var map = document.getElementById('skillsMap');
	var world = document.getElementById('skillsWorld');
	if (!map || !world)
		return;

	var nodes = Array.prototype.slice.call(lab.querySelectorAll('.skill-node'));
	var lines = Array.prototype.slice.call(lab.querySelectorAll('.skills-line'));
	var insightLabel = lab.querySelector('.skills-insight__label');
	var insightTitle = document.getElementById('skillsInsightTitle');
	var insightText = document.getElementById('skillsInsightText');
	var insightLinks = document.getElementById('skillsInsightLinks');
	var activeNode = null;
	var lockedNode = null;
	var activeDefaultProof = '';
	var minScale = 0.85;
	var maxScale = 2.2;
	var view = { tx: 0, ty: 0, scale: 1 };
	var isDragging = false;
	var dragPointerId = null;
	var dragStartX = 0;
	var dragStartY = 0;
	var dragStartTx = 0;
	var dragStartTy = 0;

	var clamp = function(value, min, max) {
		return Math.min(max, Math.max(min, value));
	};

	var clampView = function() {
		var rect = map.getBoundingClientRect();
		var scaledWidth = rect.width * view.scale;
		var scaledHeight = rect.height * view.scale;

		if (view.scale <= 1) {
			var freePanX = rect.width * 0.3;
			var freePanY = rect.height * 0.3;
			view.tx = clamp(view.tx, -freePanX, freePanX);
			view.ty = clamp(view.ty, -freePanY, freePanY);
			return;
		}

		var minTx = rect.width - scaledWidth;
		var minTy = rect.height - scaledHeight;

		view.tx = clamp(view.tx, minTx, 0);
		view.ty = clamp(view.ty, minTy, 0);
	};

	var applyView = function() {
		world.style.transform = 'translate(' + view.tx.toFixed(2) + 'px, ' + view.ty.toFixed(2) + 'px) scale(' + view.scale.toFixed(3) + ')';
	};

	var getNodeLinks = function(node) {
		var links = [];
		var rawLinks = node.getAttribute('data-links');

		if (rawLinks) {
			rawLinks.split(';').forEach(function(entry) {
				var item = entry.trim();
				if (!item)
					return;

				var parts = item.split('|');
				var href = (parts[0] || '').trim();
				var label = (parts[1] || 'Voir le projet').trim();
				var context = (parts.slice(2).join('|') || '').trim();

				if (href)
					links.push({ href: href, label: label, context: context });
			});
		}

		if (!links.length) {
			var fallbackLink = (node.getAttribute('data-link') || '').trim();
			if (fallbackLink)
				links.push({
					href: fallbackLink,
					label: 'Voir le projet lié',
					context: (node.getAttribute('data-proof') || '').trim()
				});
		}

		return links;
	};

	var updateLockState = function() {
		if (insightLabel)
			insightLabel.textContent = lockedNode ? 'Focus verrouillé' : 'Focus actuel';

		lab.classList.toggle('is-node-locked', !!lockedNode);
	};

	var restoreDefaultProof = function(node) {
		if (insightText && activeNode === node)
			insightText.textContent = activeDefaultProof;
	};

	var activateNode = function(node, options) {
		options = options || {};

		if (!node)
			return;
		if (lockedNode && node !== lockedNode && !options.force)
			return;

		activeNode = node;
		activeDefaultProof = node.getAttribute('data-proof') || '';

		nodes.forEach(function(item) {
			item.classList.toggle('is-active', item === node);
			item.classList.toggle('is-locked', item === lockedNode);
		});

		if (insightTitle)
			insightTitle.textContent = node.getAttribute('data-title') || '';
		if (insightText)
			insightText.textContent = activeDefaultProof;

		if (insightLinks) {
			var projectLinks = getNodeLinks(node);

			insightLinks.innerHTML = '';

			projectLinks.forEach(function(link, index) {
				var anchor = document.createElement('a');
				anchor.href = link.href;
				anchor.className = index === 0 ? 'button primary small' : 'button small';
				anchor.textContent = link.label;

				if (link.context && insightText) {
					anchor.addEventListener('mouseenter', function() {
						if (activeNode === node)
							insightText.textContent = link.context;
					});
					anchor.addEventListener('focus', function() {
						if (activeNode === node)
							insightText.textContent = link.context;
					});
					anchor.addEventListener('mouseleave', function() {
						restoreDefaultProof(node);
					});
					anchor.addEventListener('blur', function() {
						restoreDefaultProof(node);
					});
				}

				insightLinks.appendChild(anchor);
			});

			insightLinks.hidden = projectLinks.length === 0;
		}

		updateLockState();
	};

	lines.forEach(function(line, index) {
		var length = line.getTotalLength();
		line.style.strokeDasharray = length;
		line.style.strokeDashoffset = length;
		line.style.animationDelay = (index * 0.07) + 's';
	});

	nodes.forEach(function(node) {
		node.addEventListener('mouseenter', function() {
			if (isDragging)
				return;
			activateNode(node);
		});

		node.addEventListener('focus', function() {
			activateNode(node);
		});

		node.addEventListener('click', function() {
			lockedNode = lockedNode === node ? null : node;
			activateNode(node, { force: true });
		});
	});

	map.addEventListener('wheel', function(event) {
		event.preventDefault();

		var rect = map.getBoundingClientRect();
		var pointerX = event.clientX - rect.left;
		var pointerY = event.clientY - rect.top;
		var zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
		var nextScale = clamp(view.scale * zoomFactor, minScale, maxScale);

		if (Math.abs(nextScale - view.scale) < 0.0001)
			return;

		var worldX = (pointerX - view.tx) / view.scale;
		var worldY = (pointerY - view.ty) / view.scale;

		view.scale = nextScale;
		view.tx = pointerX - (worldX * view.scale);
		view.ty = pointerY - (worldY * view.scale);

		clampView();
		applyView();
	}, { passive: false });

	map.addEventListener('pointerdown', function(event) {
		if (event.button !== 0)
			return;
		if (event.target.closest('.skill-node') || event.target.closest('a'))
			return;

		isDragging = true;
		dragPointerId = event.pointerId;
		dragStartX = event.clientX;
		dragStartY = event.clientY;
		dragStartTx = view.tx;
		dragStartTy = view.ty;

		map.classList.add('is-dragging');
		map.setPointerCapture(dragPointerId);
		event.preventDefault();
	});

	map.addEventListener('pointermove', function(event) {
		var rect = map.getBoundingClientRect();
		var x = ((event.clientX - rect.left) / rect.width) * 100;
		var y = ((event.clientY - rect.top) / rect.height) * 100;

		map.style.setProperty('--mx', x.toFixed(2) + '%');
		map.style.setProperty('--my', y.toFixed(2) + '%');

		if (!isDragging || event.pointerId !== dragPointerId)
			return;

		view.tx = dragStartTx + (event.clientX - dragStartX);
		view.ty = dragStartTy + (event.clientY - dragStartY);

		clampView();
		applyView();
	});

	var stopDragging = function(event) {
		if (!isDragging || event.pointerId !== dragPointerId)
			return;

		isDragging = false;
		map.classList.remove('is-dragging');
		map.releasePointerCapture(dragPointerId);
		dragPointerId = null;
	};

	map.addEventListener('pointerup', stopDragging);
	map.addEventListener('pointercancel', stopDragging);

	map.addEventListener('pointerleave', function() {
		map.style.setProperty('--mx', '50%');
		map.style.setProperty('--my', '50%');
	});

	if (nodes.length > 0)
		activateNode(nodes[0], { force: true });

	clampView();
	applyView();

	window.addEventListener('resize', function() {
		clampView();
		applyView();
	}, { passive: true });

	var startLabAnimation = function() {
		lab.classList.add('is-live');
	};

	if ('IntersectionObserver' in window) {
		var observer = new IntersectionObserver(function(entries, obs) {
			entries.forEach(function(entry) {
				if (!entry.isIntersecting)
					return;

				startLabAnimation();
				obs.disconnect();
			});
		}, { threshold: 0.25 });

		observer.observe(lab);
	}
	else
		startLabAnimation();
})();

(function($) {

	var	$window = $(window),
		$body = $('body');

	// Breakpoints.
		breakpoints({
			xlarge:   [ '1281px',  '1680px' ],
			large:    [ '981px',   '1280px' ],
			medium:   [ '737px',   '980px'  ],
			small:    [ '481px',   '736px'  ],
			xsmall:   [ '361px',   '480px'  ],
			xxsmall:  [ null,      '360px'  ]
		});

	// Play initial animations on page load.
		$window.on('load', function() {
			window.setTimeout(function() {
				$body.removeClass('is-preload');
			}, 100);
		});

	// Touch?
		if (browser.mobile)
			$body.addClass('is-touch');

	// Forms.
		var $form = $('form');

		// Auto-resizing textareas.
			$form.find('textarea').each(function() {

				var $this = $(this),
					$wrapper = $('<div class="textarea-wrapper"></div>'),
					$submits = $this.find('input[type="submit"]');

				$this
					.wrap($wrapper)
					.attr('rows', 1)
					.css('overflow', 'hidden')
					.css('resize', 'none')
					.on('keydown', function(event) {

						if (event.keyCode == 13
						&&	event.ctrlKey) {

							event.preventDefault();
							event.stopPropagation();

							$(this).blur();

						}

					})
					.on('blur focus', function() {
						$this.val($.trim($this.val()));
					})
					.on('input blur focus --init', function() {

						$wrapper
							.css('height', $this.height());

						$this
							.css('height', 'auto')
							.css('height', $this.prop('scrollHeight') + 'px');

					})
					.on('keyup', function(event) {

						if (event.keyCode == 9)
							$this
								.select();

					})
					.triggerHandler('--init');

				// Fix.
					if (browser.name == 'ie'
					||	browser.mobile)
						$this
							.css('max-height', '10em')
							.css('overflow-y', 'auto');

			});

	// Menu.
			
			
		var $menu = $('#menu');

		$menu.wrapInner('<div class="inner"></div>');

		$menu._locked = false;

		$menu._lock = function() {

			if ($menu._locked)
				return false;

			$menu._locked = true;

			window.setTimeout(function() {
				$menu._locked = false;
			}, 350);

			return true;

		};

		$menu._show = function() {

			if ($menu._lock())
				$body.addClass('is-menu-visible');

		};

		$menu._hide = function() {

			if ($menu._lock())
				$body.removeClass('is-menu-visible');

		};

		$menu._toggle = function() {

			if ($menu._lock())
				$body.toggleClass('is-menu-visible');

		};

		$menu
			.appendTo($body)
			.on('click', function(event) {
				event.stopPropagation();
			})
			.on('click', 'a', function(event) {

				var href = $(this).attr('href');

				event.preventDefault();
				event.stopPropagation();

				// Hide.
					$menu._hide();

				// Redirect.
					if (href == '#menu')
						return;

					window.setTimeout(function() {
						window.location.href = href;
					}, 350);

			})
			.append('<a class="close" href="#menu">Close</a>');

		$body
			.on('click', 'a[href="#menu"]', function(event) {

				event.stopPropagation();
				event.preventDefault();

				// Toggle.
					$menu._toggle();

			})
			.on('click', function(event) {

				// Hide.
					$menu._hide();

			})
			.on('keydown', function(event) {

				// Hide on escape.
					if (event.keyCode == 27)
						$menu._hide();

			});

})(jQuery);
