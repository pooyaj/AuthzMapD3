(function(){
  var margin = {top: 80, right: 0, bottom: 10, left: 200},
      width = 730,
      height = 900,
      mode = 0;

  var x = d3.scale.ordinal().rangeBands([0, width]),
      y=0,
      yrange = d3.scale.ordinal(),
      yrangeBrush = d3.scale.ordinal().rangeBands([0, height]),
      st = d3.scale.ordinal().domain([0, 1, 2]).range(["#666", "#FF3232", "#3bd268"]); // state color scale
      

  var svg = d3.select("body").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style("margin-left", -margin.left + "px")
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  d3.json("data.json", function(acdata) {
    var matrix = [],
        users = acdata.users, // read users
        roles = acdata.roles, // read roles
        assignments = acdata.assignments, // read user-to-role assignments
        u = users.length, // # of users
        r = roles.length; // # of roles
        
        yrange.rangeBands([0, u]);

        
    // Compute index per user, for simplicity based on their order.
    users.forEach(function(user, i) {
      user.index = i;
      user.count = 0;
      // create an empty access matrix, each cell is an object where x = role, y = user
      matrix[i] = d3.range(r).map(function(j) { return {x: j, y: i, z: 0, s: 0}; });
    });

    // compute index per role
    roles.forEach(function(role, i) {
      role.index = i;
    });

    // Fill up the access matrix, and counting roles per user and user per role.
    assignments.forEach(function(assignment) {
      matrix[assignment.source][assignment.target].z += 1;
      users[assignment.source].count += 1;
      roles[assignment.target].count += 1;
    });

    // Precompute the orders.
    
    var rorders = {
      rname1: d3.range(r).sort(function(a, b) { return d3.ascending(roles[a].name, roles[b].name); }),
      rname2: d3.range(r).sort(function(a, b) { return d3.descending(roles[a].name, roles[b].name); })
    };

    var uorders = {
      uname1: d3.range(u).sort(function(a, b) { return d3.ascending(users[a].name, users[b].name); }),
      uname2: d3.range(u).sort(function(a, b) { return d3.descending(users[a].name, users[b].name); }),
      job: d3.range(u).sort(function(a, b) { return d3.ascending(users[a].job, users[b].job); })
    };


    // The default sort order.
    x.domain(rorders.rname1);
    yrange.domain(d3.range(u));

    // The matrix
    svg.append("rect")
        .attr("class", "background")
        .attr("width", width)
        .attr("height", x.rangeBand()*u)
        .style("cursor", "crosshair");

    // add the rows
    var row = svg.selectAll(".row")
        .data(matrix)
      .enter().append("g")
        .attr("class", "row")
        .attr("transform", function(d, i) { return "translate(0," + y+ i*x.rangeBand() + ")"; })
        .each(row);

    row.append("line")
        .attr("x2", width);

    // adding text for the user name and job function
    row.append("text")
        .attr("x", -6)
        .attr("y", x.rangeBand() / 2)
        .attr("text-anchor", "end")
        .attr("class", "main-text")
        .text(function(d, i) { return users[i].name; })
        .classed("name", true);
    row.append("text")
        .attr("x", -6)
        .attr("y", x.rangeBand() / 2)
        .attr("dy", "1.5em")
        .attr("text-anchor", "end")
        .text(function(d, i) { return users[i].job; });

    // adding roles as columns
    var column = svg.selectAll(".column")
        .data(roles)
      .enter().append("g")
        .attr("class", "column")
        .attr("transform", function(d, i) { return "translate(" + x(i) + ")rotate(-90)"; });

    column.append("line")
        .attr("x1", -height);

    column.append("text")
        .attr("x", 6)
        .attr("y", x.rangeBand() / 2)
        .attr("dy", ".32em")
        .attr("text-anchor", "start")
        .text(function(d, i) { return roles[i].name; })
        .on("click", role_selectall);

     var brush = d3.svg.brush()
        .x(x)
        .y(yrangeBrush)
        .on("brush", brushmove)
        .on("brushend", brushend);
    
    // create cells inside each row 
    function row(row) {
      var cell = d3.select(this).selectAll(".cell")
          .data(row.filter(function(d) { return d.z; }))
        .enter().append("rect")
          .attr("class", "cell")
          .attr("x", function(d) { return x(d.x); })
          .attr("width", x.rangeBand())
          .attr("height", x.rangeBand())
          .style("fill", function(d) { return st(d.s); })
          .style("cursor", "cell")
          .on("mouseover", mouseover)
          .on("mouseout", mouseout)
          .on("click", mouseclick);
    }

    // mouse events
    function mouseover(p) {
      d3.selectAll(".row .name").classed("active", function(d, i) { return i == p.y; });
      d3.selectAll(".column text").classed("active", function(d, i) { return i == p.x; });
    }

    function mouseout() {
      d3.selectAll("text").classed("active", false);
    }

    function mouseclick(p) {
      p.s = ++p.s % 3;
      console.log("clicked");
      d3.select(this).style("fill", function(d) { return st(d.s); });
    }

    // to be added (select all user-to-role assignments)
    function role_selectall(p) {

    }

    // sort handlers
    d3.select("#order-roles").on("change", function() {
      order_roles(this.value);
    });

    d3.select("#order-users").on("change", function() {
      order_users(this.value);
    });

    // actual ordering of the items 
    function order_users(value) {
      yrange.domain(uorders[value]);
      var t = svg.transition().duration(500);
      t.selectAll(".row")
          .attr("transform", function(d, i) { return "translate(0," + y+yrange(i)*x.rangeBand() + ")"; });
    }

    function order_roles(value) {
      x.domain(rorders[value]);

      var t = svg.transition().duration(500);
      t.selectAll(".row")
        .selectAll(".cell")
          .attr("x", function(d) { return x(d.x); });

      t.selectAll(".column")
          .attr("transform", function(d, i) { return "translate(" + x(i) + ")rotate(-90)"; });
    }

    // brushing functions

    // activating brush for brushing purpose
    d3.select("#activate_brush").on("click", function() {
      mode = (mode +1)%2;
      if (mode) {
        svg.append("g")
         .attr("class", "brush")
         .call(brush);
         this.innerHTML = "Deactivate Brush";
        } else {
          d3.selectAll(".cell").classed("opc", false);
          d3.selectAll(".brush").remove();
          this.innerHTML = "Activate Brush";
        }
    });


    function brushmove(p) {
      var e = brush.extent();
      d3.selectAll(".cell").classed("opc", function(d, i) {
          return !((x(d.x) > e[0][0] -x.rangeBand()) &&
                (yrange(d.y)*x.rangeBand() > e[0][1]-x.rangeBand()) &&
                (e[1][0]  > x(d.x)) &&
                (e[1][1]  > yrange(d.y)*x.rangeBand()));
       });
    }

    function brushend(p) {
      if (brush.empty()) d3.selectAll(".cell").classed("opc", false);
    }
  });
})();