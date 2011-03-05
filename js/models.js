/**
 * !!! TODO: rename to client
 */
Channels.cl = new Channels.ChannelsClient();


/*Channels.Store = function() {
};
_.extend(Channels.Store, {
    save: function() {
	throw 'Not implemented';
    },

    create: function(model) {
	throw 'Not implemented';
	return model;
    },

    update: function(model) {
	throw 'Not implemented';
    },

    find: function(model) {
	throw 'Not implemented';
    },

    findAll: function() {
	throw 'Not implemented';
    },

    destroy: function(model) {
	throw 'Not implemented';
    }

});*/

Backbone.sync = function() {
    console.log('Backbone.sync ' + _.toArray(arguments).join(', '));
};

Channels.Item = Backbone.Model.extend({
    getTextContent: function() {
	var typeTexts = {};
	_.forEach(this.get('elements'), function(entryEl) {
	    _.forEach(entryEl.getElementsByTagName('content'), function(contentEl) {
		var type = contentEl.getAttribute('type') || "text";
		typeTexts[type] = $(contentEl).text();
	    });
	});
	return typeTexts.text || typeTexts.xhtml;
    },

    /**
     * @return {Date}
     */
    getPublished: function() {
	var result = undefined;
	var elements = this.get('elements');
	if (elements)
	    _.forEach(elements, function(entryEl) {
		if (!result)
		    _.forEach(entryEl.getElementsByTagName('published'),
			      function(publishedEl) {
		        var d = new Date(publishedEl.textContent);
			if (!isNaN(d))
			    result = d;
		    });
	    });
	return result;
    }
});

Channels.Items = Backbone.Collection.extend({
    model: Channels.Item,

    /**
     * Order by published time, ascending
     */
    comparator: function(item) {
	var published = item.getPublished();
	return published ? published.getTime() : 0;
    }
});

Channels.Node = Backbone.Model.extend({
    initialize: function() {
	var that = this;
	var items = new Channels.Items();
	items.bind('all', function() {
	    /* Propagate any change to the node */
	    that.trigger('change:items', that);
	});
	this.set({ items: items });

	/* Fetch items */
	Channels.cl.getItems(this.get('serviceJid'), this.get('id'), function(err, items) {
	    _.forEach(items, function(item) {
		that.setItem(item.id, item.elements);
	    });
	});
	/* Fetch meta data */
	Channels.cl.getNodeMeta(this.get('serviceJid'), this.get('id'), function(err, fields) {
	    that.set({ meta: fields });
	});
    },

    getLastItem: function() {
	var items = this.get('items');
	return items.at(items.size() - 1);
    },

    setItem: function(id, elements) {
	var items = this.get('items');
	var item;
	if ((item = items.get(id))) {
	    /* Avoid backbone views comparing DOM elements as this may
	     * be expensive and exhausts max stack level.
	     */
	    item.unset('elements');
	    item.set({ elements: elements });
	} else {
	    items.add(new Channels.Item({ id: id,
					  elements: elements }));
	}
    },

    post: function(text, cb) {
	var entry = $("<entry xmlns='http://www.w3.org/2005/Atom'><content type='text'></content><published></published></entry>");
	entry.find('content').text(text);
	entry.find('published').text(isoDateString(new Date()));

	var jid = this.get('serviceJid');
	var nodeName = this.get('id');
	Channels.cl.publishItem(jid, nodeName, null, [entry[0]], cb);
    }
});

Channels.Service = Backbone.Model.extend({
    initialize: function() {
	var jid = this.get('id');

	var that = this;
	var pending = 2;
	var done = function() {
	    pending--;
	    if (pending < 1) {
		that.trigger('sync');
	    }
	};
	Channels.cl.getSubscriptions(jid, function(err, subscriptions) {
	    _.forEach(subscriptions, function(subscription) {
		that.getNode(subscription.node).
		    set({ subscription: subscription.subscription });
	    });
	    done();
	});
	Channels.cl.getAffiliations(jid, function(err, affiliations) {
	    _.forEach(affiliations, function(affiliation) {
		that.getNode(affiliation.node).
		    set({ affiliation: affiliation.affiliation });
	    });
	    done();
	});
    },

    /** Adds on demand */
    getNode: function(name) {
	var node = this.get('node:' + name);
	if (!node) {
	    node = new Channels.Node({ id: name, serviceJid: this.get('id') });
	    var attrs = {};
	    attrs['node:' + name] = node;
	    this.set(attrs);
	}
	return node;
    },

    /**
     * @return [{ nodeTail: String, node: Channels.Node }]
     */
    getUserNodes: function(user) {
	var nameHead = 'node:/user/' + user + '/';
	var results = [];
	_.each(this.toJSON(), function(node, name) {
	    if (name.indexOf(nameHead) === 0) {
		var nodeTail = name.substr(nameHead.length);
		results.push({ nodeTail: nodeTail,
			       node: node });
	    }
	});
	return results;
    }
});

Channels.Channel = Backbone.Model.extend({
    initialize: function() {
	console.log({newChannel:this.attributes})
    },

    addNode: function(nodeTail, node) {
	var attrs = {};
	attrs['node:' + nodeTail] = node;
	this.set(attrs);

	var that = this;
	node.bind('change:items', function() {
	    /* Propagate */
	    console.log('Propagate change:items from node to channel');
	    that.trigger('change:items', that);
	});
    },

    hasNodes: function() {
	for(var k in this.attributes) {
	    if (this.attributes.hasOwnProperty(k) && /^node:/.test(k))
		return true;
	}
	return false;
    },

    /* Simple getter */
    getNode: function(nodeTail) {
	return this.get('node:' + nodeTail);
    },

    /**
     * Grab user's channels from service
     */
    syncNodes: function(service) {
	var that = this;
	_.forEach(service.getUserNodes(this.get('id')), function(userNode) {
	    if (!that.getNode(userNode.nodeTail))
		that.addNode(userNode.nodeTail, userNode.node);
	});
    }
});

/**
 * Contains all the channels and performs discovery on a per-user
 * base. This forward approach ensures we always seek the responsible
 * server first before adding nodes to a channel. See hookUser().
 */
Channels.Channels = Backbone.Collection.extend({
    model: Channels.Channel,

    initialize: function() {
	var that = this;
	this.services = {};

	Channels.cl.bind('online', function() {
	    console.log('online');
	    that.hookUser(Channels.cl.jid);

	    Channels.cl.getRoster(function(error, roster) {
		if (!roster)
		    return;
		_.forEach(roster, function(item) {
		    that.hookUser(item.jid);
		});
	    });
	});

	/* TODO: hook roster updates */

	Channels.cl.bind('item', function(jid, nodeName, id, elements) {
	    var service = that.getService(jid);
	    var node = service.getNode(nodeName);
	    if (!node) {
		/* We only care about nodes we subscribed to.  If
		 * subscriptions haven't been synced, we'll get items
		 * later anyway.
		 */
		return;
	    }
	    node.setItem(id, elements);
	});
    },

    /**
     * Adds on demand
     *
     * @param jid (Domain of) the service
     */
    getService: function(jid) {
	if (!this.services.hasOwnProperty(jid))
	    this.services[jid] = new Channels.Service({ id: jid });
	return this.services[jid];
    },

    /**
     * Adds on demand
     *
     * @param jid User
     */
    getChannel: function(jid) {
	var channel = this.get(jid);
	if (!channel) {
	    channel = new Channels.Channel({ id: jid });
	    this.add(channel);
	}
	return channel;
    },

    hookUser: function(user) {
	console.log('hookUser ' + user);
	var that = this;
	Channels.cl.findUserService(user, function(serviceJids) {
	    that.trigger('userService', user, serviceJids);

	    _.forEach(serviceJids, function(serviceJid) {
		var service = that.getService(serviceJid);
		var channel = that.getChannel(user);
		/* nodes known already? populate channel! */
		channel.syncNodes(service);

		service.bind('change', function() {
		    /* new nodes: populate channel */
		    channel.syncNodes(service);
		});
	    });
	});
    }
});

/**
 * Format Date as ISO8601
 *
 * https://developer.mozilla.org/en/JavaScript/Reference/global_objects/date#Example.3a_ISO_8601_formatted_dates
 */
function isoDateString(d) {
    function pad(n) {
	return n<10 ? '0'+n : n;
    }
    return d.getUTCFullYear()+'-'
	+ pad(d.getUTCMonth()+1)+'-'
	+ pad(d.getUTCDate())+'T'
	+ pad(d.getUTCHours())+':'
	+ pad(d.getUTCMinutes())+':'
	+ pad(d.getUTCSeconds())+'Z';
 }
