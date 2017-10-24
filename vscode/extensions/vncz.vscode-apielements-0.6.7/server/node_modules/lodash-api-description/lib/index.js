'use strict';

// Inject instance of lodash and add in mixins
module.exports = function(lodash) {
  lodash.mixin({
    content: content,
    contentOrValue: contentOrValue,
    dataStructures: dataStructures,
    resources: resources,
    transitions: transitions,
    copy: copy,
    httpTransactions: httpTransactions,
    httpRequests: httpRequests,
    httpResponses: httpResponses,
    messageBodies: messageBodies,
    messageBodySchemas: messageBodySchemas,
    filterContent: filterContent
  });

  // ----------------------------------------------------------------------------
  // Mixin functions

  function content(element) {
    return lodash.get(element, 'content');
  }

  function contentOrValue(element) {
    if (lodash.isObject(element) && element.element) {
      return lodash.content(element);
    }

    return element;
  }

  function dataStructures(element) {
    return filterContent(element, {element: 'dataStructure'});
  }

  function resources(element) {
    return filterContent(element, {element: 'resource'});
  }

  function transitions(element) {
    return filterContent(element, {element: 'transition'});
  }

  function copy(element) {
    return filterContent(element, {element: 'copy'});
  }

  function httpTransactions(element) {
    return filterContent(element, {element: 'httpTransaction'});
  }

  function httpRequests(element) {
    return filterContent(element, {element: 'httpRequest'});
  }

  function httpResponses(element) {
    return filterContent(element, {element: 'httpResponse'});
  }

  function messageBodies(element) {
    return filterContent(element, {
      element: 'asset',
      meta: {
        classes: ['messageBody']
      }
    });
  }

  function messageBodySchemas(element) {
    return filterContent(element, {
      element: 'asset',
      meta: {
        classes: ['messageBodySchema']
      }
    });
  }

  // ----------------------------------------------------------------------------
  // Private helper functions

  function filterContent(element, conditions) {
    return lodash.chain(element)
      .get('content')
      .filter(conditions)
      .value();
  }
};
