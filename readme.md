This is the Buddycloud web client. See my [introduction](http://bennolan.com/2011/04/12/distributed-social-networking.html) at [bennolan.com](http://bennolan.com/). It is a Javascript + PHP implementation of a social network powered by XMPP.

# Funding

The original Diaspora-x codebase that this project is an extension of was created by Ben Nolan as a part-time project. Further development has been kindly funded by Imaginator Ltd, operators of buddycloud.com.

# Buddycloud protocol

The buddycloud protocol is being submitted as a XEP. The [current draft](http://buddycloud.org/wiki/XMPP_XEP) should be submitted in mid-2011.

# Buddycloud server implementations

The XMPP extensions that Buddycloud describes have been implemented in three projects:

* [Node.js server](https://github.com/buddycloud/channel-server)
* [Prosody implementation](http://buddycloud.com/cms/content/buddycloud-channels-built-prosody)
* The original ejabberd implementation of Buddycloud channels (obsolete)

# Installation

Requires [capt](http://github.com/bnolan/capt) and php5. (todo - this section needs expansion)

# API

The php aspects of the client provide an API for services that cannot be easily done on the client, eg - automated sending of email and uploading of images.

## Authentication

All requests to the API must be authenticated using http-auth with the the users jid and password. Requests should obviously be over https. The api will connect to the users jabber server to ensure the password is correct. This authentication check against the jabber server will only happen once per session.

## /api/email

    { data : [ {
        recipient : "friend@gmail.com",
        subject : "Visit me on Diaspora-x",
        message : "Hey Friend, come join me at..."
      }, { ... }, { ...} ]
    }

Used to send invitation emails to friends. Returns `{ success : true }` on success.

# Licence

Copyright 2010-2011 Ben Nolan

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

# Assorted notes follow - 

## References

* http://onesocialweb.org/spec/1.0/osw-activities.html
* http://xmpp.org/extensions/xep-0277.html#reply

## Content licence

Users should be able to select their own licence. By default the licence should be creative commons. The licence should be attached to content using [RFC 4946](http://tools.ietf.org/html/rfc4946).
