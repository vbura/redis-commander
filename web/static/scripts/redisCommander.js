'use strict';

function resizeTree() {
  $('#keyTree').height($(window).height() - 100);
}

function loadTree() {
  $('#keyTree').jstree({
    json_data: {
      data: {
        data: "Root",
        state: "closed",
        attr: {
          id: "root",
          rel: "root"
        }
      },
      ajax: {
        url: function (node) {
          if (node !== -1) {
            var path = $.jstree._focused().get_path(node, true).slice(1).join(':');
            return '/apiv1/keys/' + path;
          }
          return '/apiv1/keys';
        }
      }
    },
    types: {
      types: {
        "root": {
          icon: {
            image: '/images/treeRoot.png'
          }
        },
        "string": {
          icon: {
            image: '/images/treeString.png'
          }
        },
        "list": {
          icon: {
            image: '/images/treeList.png'
          }
        },
        "zset": {
          icon: {
            image: '/images/treeZSet.png'
          }
        }
      }
    },
    plugins: [ "themes", "json_data", "types", "ui" ]
  })
    .bind("select_node.jstree", treeNodeSelected)
    .delegate("a", "click", function (event, data) { event.preventDefault(); });
}

function treeNodeSelected(event, data) {
  $('#body').html('Loading...');
  var pathParts = getKeyTree().get_path(data.rslt.obj, true);
  if (pathParts.length === 1) {
    $.get('/apiv1/server/info', function (data, status) {
      if (status != 'success') {
        return alert("Could not load server info");
      }

      data = JSON.parse(data);
      var html = new EJS({ url: '/templates/serverInfo.ejs' }).render(data);
      $('#body').html(html);
    });
  } else {
    var path = pathParts.slice(1).join(':');
    $.get('/apiv1/key/' + path, function (data, status) {
      if (status != 'success') {
        return alert("Could not load key data");
      }

      data = JSON.parse(data);
      console.log("rendering type" + data.type);
      switch (data.type) {
      case 'string':
        selectTreeNodeString(data);
        break;
      case 'list':
        selectTreeNodeList(data);
        break;
      case 'zset':
        selectTreeNodeZSet(data);
        break;
      case 'none':
        selectTreeNodeBranch(data);
        break;
      default:
        var html = JSON.stringify(data);
        $('#body').html(html);
        break;
      }
    });
  }
}

function saveComplete() {
  setTimeout(function () {
    $('#saveKeyButton').html("Save");
    $('#saveKeyButton').removeAttr("disabled");
  }, 500);
}

function selectTreeNodeBranch(data) {
  var html = new EJS({ url: '/templates/editBranch.ejs' }).render(data);
  $('#body').html(html);
}

function selectTreeNodeString(data) {
  var html = new EJS({ url: '/templates/editString.ejs' }).render(data);
  $('#body').html(html);

  try {
    data.value = JSON.stringify(JSON.parse(data.value), null, '  ');
    $('#isJson').val('true');
  } catch (ex) {
    $('#isJson').val('false');
  }

  $('#stringValue').val(data.value);
  $('#editStringForm').ajaxForm({
    beforeSubmit: function () {
      console.log('saving');
      $('#saveKeyButton').attr("disabled", "disabled");
      $('#saveKeyButton').html("<i class='icon-refresh'></i> Saving");
    },
    error: function (err) {
      console.log('save error', arguments);
      alert("Could not save '" + err.statusText + "'");
      saveComplete();
    },
    success: function () {
      console.log('saved', arguments);
      saveComplete();
    }
  });
}

function selectTreeNodeList(data) {
  var html = new EJS({ url: '/templates/editList.ejs' }).render(data);
  $('#body').html(html);
}

function selectTreeNodeZSet(data) {
  var html = new EJS({ url: '/templates/editZSet.ejs' }).render(data);
  $('#body').html(html);
}

function getKeyTree() {
  return $.jstree._reference('#keyTree');
}

function refreshTree() {
  getKeyTree().refresh();
}

function deleteBranch(branchPrefix) {
  var query = branchPrefix + ':*';
  var result = confirm('Are you sure you want to delete "' + query + '"? This will delete all children as well');
  if (result) {
    $.post('/apiv1/keys/' + query + '?action=delete', function (data, status) {
      if (status != 'success') {
        return alert("Could not delete branch");
      }

      refreshTree();
      getKeyTree().select_node(-1);
      $('#body').html('');
    });
  }
}