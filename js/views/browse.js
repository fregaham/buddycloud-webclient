/**
 * col2 BrowseView
 */

var BrowseView = Backbone.View.extend({
    el: '#col2',

    initialize: function(channel) {
        this.channel = channel;
        this.itemViews = [];
        _.bindAll(this, 'render', 'posted', 'updatePostView');
        this.render();

        channel.bind('change', this.render);
        channel.bind('change:items', this.render);
    },

    render: function() {
	this.hookChannelNode();

        this.$('.col-title').text('> ' + this.channel.get('id'));
        $('#c1').text(peek(this.channel, 'geo/future') || '');
        $('#c2').text(peek(this.channel, 'geo/current') || '');
        $('#c3').text(peek(this.channel, 'geo/previous') || '');
    },

    /**
     * why call this from render?
     * * the node could be there already
     * * the node could still sync from the server
     */
    hookChannelNode: function() {
        var that = this;

	/* Got it already? */
	if (this.channelNode)
	    return;

        this.channelNode = this.channel.getNode('channel');
	/* Is there one already? */
	if (!this.channelNode)
	    return;

	/* Attach: */
        var items = this.channelNode.get('items');
	/* Populate with existing items */
	items.forEach(function(item) {
            that.insertView(new BrowseItemView(item));
        });
	/* Hook future updates */
	items.bind('add', function(item) {
	    console.log('addItem to browseview');
            that.insertView(new BrowseItemView(item));
        });

	this.channelNode.bind('change', this.updatePostView);
	this.updatePostView();
    },

    posted: function() {
	if (this.postView) {
	    this.postView.remove();
	    delete this.postView;
	}

	this.updatePostView();
    },

    /* requires this.channelNode to be set by hookChannelNode() */
    updatePostView: function() {
	if (!this.channelNode.canPost()) {
	    /* Cannot post; remove: */
	    if (this.postView) {
		this.postView.remove();
		delete this.postView;
	    }
	} else {
	    /* Can post: */
	    if (this.postView) {
		/* Already there */
		return;
	    }

	    this.postView = new BrowsePostView(this.channelNode);
	    this.postView.bind('done', this.posted);
	    this.insertView(this.postView);
	}
    },

    insertView: function(view) {
	/* There's no view for this item, right? FIXME. */
	if (_.any(this.itemViews, function(view1) {
		return view1.item && view.item === view1.item;
	})) {
	    /* Should not happen */
	    console.warn('Not inserting duplicate view for ' + view.item);
	    return;
	}

	/* Look for the least but still more recent item below which to insert */
	var before = $('#col2 h2');
	var published = view.getDate &&
	    view.getDate() ||
	    new Date();
	_.forEach(this.itemViews, function(itemView) {
	    var published1 = itemView &&
			  itemView.getDate &&
			  itemView.getDate();
	    if (published1 && published1 > published) {
		before = itemView.el;
	    }
	});

	/* add to view model & DOM */
        this.itemViews.push(view);
        before.after(view.el);
        /* Views may not have an `el' field before their
         * `initialize()' member is called. We need to trigger
         * binding events again: */
        view.delegateEvents();
    },

    /**
     * Backbone's remove() just removes this.el, which we don't
     * want. Therefore we don't call the superclass.
     */
    remove: function() {
        this.channel.unbind('change', this.render);
        this.channel.unbind('change:items', this.render);
        if (this.postView) {
            this.postView.unbind('done', this.posted);
	}
        _.forEach(this.itemViews, function(itemView) {
            itemView.remove();
        });
    }
});

var BrowseItemView = Backbone.View.extend({
    initialize: function(item) {
        this.item = item;

        this.el = $(this.template);
        this.render();
    },

    render: function() {
        this.$('.entry-content p:nth-child(1)').text(this.item.getTextContent());

	var published = this.item.getPublished();
	if (published) {
	    var ago = $('<span></span>');
	    ago.attr('title', isoDateString(published));
	    this.$('.entry-content .meta').append(ago);
	    /* Activate plugin: */
	    ago.timeago();
	}
	/* TODO: add geoloc info */
    },

    /* for view ordering */
    getDate: function() {
	return this.item.getPublished();
    }
});

$(function() {
      BrowseItemView.prototype.template = $('#browse_entry_template').html();
});

/**
 * Triggers 'done' so BrowseView can remove it on success.
 */
var BrowsePostView = Backbone.View.extend({
    events: {
        'click a.btn2': 'post'
    },

    initialize: function(node) {
        this.node = node;
        this.el = $(this.template);
        this.$('textarea')[0].focus();
    },

    /**
     * The item to be posted should always be on top.
     */
    getDate: function() {
	return new Date();
    },

    post: function() {
        var that = this;
        var textarea = this.$('textarea');
        textarea.attr('disabled', 'disabled');
        this.$('a.btn2').hide();
        this.node.post(textarea.val(), function(err) {
            if (err) {
                textarea.removeAttr('disabled');
                that.$('a.btn2').show();
            } else {
                that.trigger('done');
                /* TODO: not subscribed? manual refresh */
            }
        });

        return false;
    },

    remove: function() {
        this.trigger('remove');
        Backbone.View.prototype.remove.apply(this, arguments);
    }
});
$(function() {
      BrowsePostView.prototype.template = $('#browse_post_template').html();
});
