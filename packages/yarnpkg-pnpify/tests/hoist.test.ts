import {hoist, HoisterPackageTree} from '../sources/hoist';

describe('hoist', () => {
  it('should do very basic hoisting', () => {
    // . → A → B
    // should be hoisted to:
    // . → A
    //   → B
    const tree = {
      pkgId: 0, // .
      deps: new Set([{
        pkgId: 1, // A
        deps: new Set([{
          pkgId: 2, // B
          deps: new Set<HoisterPackageTree>(),
          peerDepIds: new Set<number>(),
        }]),
        peerDepIds: new Set<number>(),
      }]),
      peerDepIds: new Set<number>(),
    };
    const packages = [
      {name: '.'},
      {name: 'A'},
      {name: 'B'},
    ];
    const result = hoist(tree, packages);
    expect(result).toEqual({
      pkgId: 0, // .
      deps: new Set([{
        pkgId: 1, // A
        deps: new Set(),
      }, {
        pkgId: 2, // B
        deps: new Set(),
      }]),
    });
  });

  it('should not hoist different package with the same name', () => {
    // . → A → B@X
    //   → B@Y
    // should not be changed
    const tree = {
      pkgId: 0, // .
      deps: new Set([{
        pkgId: 1, // A
        deps: new Set([{
          pkgId: 2, // B@X
          deps: new Set<HoisterPackageTree>(),
          peerDepIds: new Set<number>(),
        }]),
        peerDepIds: new Set<number>(),
      }, {
        pkgId: 3, // B@Y
        deps: new Set<HoisterPackageTree>(),
        peerDepIds: new Set<number>(),
      }]),
      peerDepIds: new Set<number>(),
    };
    const packages = [
      {name: '.'},
      {name: 'A'},
      {name: 'B'},
      {name: 'B'},
    ];
    const result = hoist(tree, packages);
    expect(result).toEqual({
      pkgId: 0, // .
      deps: new Set([{
        pkgId: 1, // A
        deps: new Set([{
          pkgId: 2, // B@X
          deps: new Set(),
        }]),
      }, {
        pkgId: 3, // B@Y
        deps: new Set(),
      }]),
    });
  });

  it('should not hoist package that has several versions on the same tree path', () => {
    // . → A → B@X → C → B@Y
    // should be hoisted to:
    // . → A
    //   → B@X
    //   → C → B@Y
    const tree = {
      pkgId: 0, // .
      deps: new Set([{
        pkgId: 1, // A
        deps: new Set([{
          pkgId: 2, // B@X
          deps: new Set([{
            pkgId: 3, // C
            deps: new Set([{
              pkgId: 4, // B@Y
              deps: new Set<HoisterPackageTree>(),
              peerDepIds: new Set<number>(),
            }]),
            peerDepIds: new Set<number>(),
          }]),
          peerDepIds: new Set<number>(),
        }]),
        peerDepIds: new Set<number>(),
      }]),
      peerDepIds: new Set<number>(),
    };
    const packages = [
      {name: '.'},
      {name: 'A'},
      {name: 'B'},
      {name: 'C'},
      {name: 'B'},
    ];
    const result = hoist(tree, packages);
    expect(result).toEqual({
      pkgId: 0, // .
      deps: new Set([{
        pkgId: 1, // A
        deps: new Set(),
      }, {
        pkgId: 2, // B@X
        deps: new Set(),
      }, {
        pkgId: 3, // C
        deps: new Set([{
          pkgId: 4, // B@Y
          deps: new Set<HoisterPackageTree>(),
        }]),
      }]),
    });
  });

  it('should perform deep hoisting', () => {
    // . → A → B@X → C@Y
    //       → C@X
    //   → B@Y
    //   → C@X
    // should be hoisted to:
    // . → A → B@X → C@Y
    //   → B@Y
    //   → C@X
    const tree = {
      pkgId: 0, // .
      deps: new Set([{
        pkgId: 1, // A
        deps: new Set([{
          pkgId: 2, // B@X
          deps: new Set([{
            pkgId: 5, // C@Y
            deps: new Set<HoisterPackageTree>(),
            peerDepIds: new Set<number>(),
          }]),
          peerDepIds: new Set<number>(),
        }, {
          pkgId: 4, // C@X
          deps: new Set<HoisterPackageTree>(),
          peerDepIds: new Set<number>(),
        }]),
        peerDepIds: new Set<number>(),
      }, {
        pkgId: 3, // B@Y
        deps: new Set<HoisterPackageTree>(),
        peerDepIds: new Set<number>(),
      }, {
        pkgId: 4, // C@X
        deps: new Set<HoisterPackageTree>(),
        peerDepIds: new Set<number>(),
      }]),
      peerDepIds: new Set<number>(),
    };
    const packages = [
      {name: '.'},
      {name: 'A'},
      {name: 'B'},
      {name: 'B'},
      {name: 'C'},
      {name: 'C'},
    ];
    const result = hoist(tree, packages);
    expect(result).toEqual({
      pkgId: 0, // .
      deps: new Set([{
        pkgId: 1, // A
        deps: new Set([{
          pkgId: 2, // B@X
          deps: new Set([{
            pkgId: 5, // C@Y
            deps: new Set(),
          }]),
        }]),
      }, {
        pkgId: 3, // B@Y
        deps: new Set(),
      }, {
        pkgId: 4, // C@X
        deps: new Set(),
      }]),
    });
  });

  it('should tolerate any cyclic dependencies', () => {
    // . → . → A → A → B@X → B@X → C@Y
    //               → C@X
    //   → B@Y
    //   → C@X
    // should be hoisted to:
    // . → . → A → B@X → C@Y
    //   → B@Y
    //   → C@X
    const tree = {
      pkgId: 0, // .
      deps: new Set([{
        pkgId: 0, // . self-ref
        deps: new Set<HoisterPackageTree>(),
        peerDepIds: new Set<number>(),
      }, {
        pkgId: 1, // A
        deps: new Set([{
          pkgId: 1, // A self-ref
          deps: new Set<HoisterPackageTree>(),
          peerDepIds: new Set<number>(),
        }, {
          pkgId: 2, // B@X
          deps: new Set([{
            pkgId: 2, // B@X self-ref
            deps: new Set<HoisterPackageTree>(),
            peerDepIds: new Set<number>(),
          }, {
            pkgId: 4, // C@Y
            deps: new Set<HoisterPackageTree>(),
            peerDepIds: new Set<number>(),
          }]),
          peerDepIds: new Set<number>(),
        }, {
          pkgId: 3, // C@X
          deps: new Set<HoisterPackageTree>(),
          peerDepIds: new Set<number>(),
        }]),
        peerDepIds: new Set<number>(),
      }, {
        pkgId: 3, // B@Y
        deps: new Set<HoisterPackageTree>(),
        peerDepIds: new Set<number>(),
      }, {
        pkgId: 4, // C@X
        deps: new Set<HoisterPackageTree>(),
        peerDepIds: new Set<number>(),
      }]),
      peerDepIds: new Set<number>(),
    };
    const packages = [
      {name: '.'},
      {name: 'A'},
      {name: 'B'},
      {name: 'B'},
      {name: 'C'},
      {name: 'C'},
    ];
    const result = hoist(tree, packages);
    expect(result).toEqual({
      pkgId: 0, // .
      deps: new Set([{
        pkgId: 0, // .
        deps: new Set(),
      }, {
        pkgId: 1, // A
        deps: new Set([{
          pkgId: 2, // B@X
          deps: new Set(),
        }]),
      }, {
        pkgId: 4, // C@Y
        deps: new Set(),
      }, {
        pkgId: 3, // C@X
        deps: new Set(),
      }]),
    });
  });

  it('should honor package popularity when hoisting', () => {
    // . → A → B@X
    //   → C → B@X
    //   → D → B@Y
    //   → E → B@Y
    //   → F → G → B@Y
    // should be hoisted to:
    // . → A → B@X
    //   → C → B@X
    //   → D
    //   → E
    //   → F
    //   → G
    //   → B@Y
    const tree = {
      pkgId: 0, // .
      deps: new Set([{
        pkgId: 1, // A
        deps: new Set([{
          pkgId: 2, // B@X
          deps: new Set<HoisterPackageTree>(),
          peerDepIds: new Set<number>(),
        }]),
        peerDepIds: new Set<number>(),
      }, {
        pkgId: 4, // C
        deps: new Set([{
          pkgId: 2, // B@X
          deps: new Set<HoisterPackageTree>(),
          peerDepIds: new Set<number>(),
        }]),
        peerDepIds: new Set<number>(),
      }, {
        pkgId: 5, // D
        deps: new Set([{
          pkgId: 3, // B@Y
          deps: new Set<HoisterPackageTree>(),
          peerDepIds: new Set<number>(),
        }]),
        peerDepIds: new Set<number>(),
      }, {
        pkgId: 6, // E
        deps: new Set([{
          pkgId: 3, // B@Y
          deps: new Set<HoisterPackageTree>(),
          peerDepIds: new Set<number>(),
        }]),
        peerDepIds: new Set<number>(),
      }, {
        pkgId: 7, // F
        deps: new Set([{
          pkgId: 8, // G
          deps: new Set([{
            pkgId: 3, // B@Y
            deps: new Set<HoisterPackageTree>(),
            peerDepIds: new Set<number>(),
          }]),
          peerDepIds: new Set<number>(),
        }]),
        peerDepIds: new Set<number>(),
      }]),
      peerDepIds: new Set<number>(),
    };
    const packages = [
      {name: '.'},
      {name: 'A'},
      {name: 'B'},
      {name: 'B'},
      {name: 'C'},
      {name: 'D'},
      {name: 'E'},
      {name: 'F'},
      {name: 'G'},
    ];
    const result = hoist(tree, packages);
    expect(result).toEqual({
      pkgId: 0, // .
      deps: new Set([{
        pkgId: 1, // A
        deps: new Set([{
          pkgId: 2, // B@X
          deps: new Set(),
        }]),
      }, {
        pkgId: 4, // C
        deps: new Set([{
          pkgId: 2, // B@X
          deps: new Set(),
        }]),
      }, {
        pkgId: 5, // D
        deps: new Set(),
      }, {
        pkgId: 6, // E
        deps: new Set(),
      }, {
        pkgId: 7, // F
        deps: new Set(),
      }, {
        pkgId: 8, // G
        deps: new Set(),
      }, {
        pkgId: 3, // B@Y
        deps: new Set(),
      }]),
    });
  });

  it('should honor peer dependencies', () => {
    // . → A → B ⟶ D@X
    //     → C → D@Y
    //     → D@X
    // should be hoisted to (A and B should share single D@X dependency):
    // . → A → B
    //     → D@X
    //   → C
    //   → D@Y
    const tree = {
      pkgId: 0, // .
      deps: new Set([{
        pkgId: 1, // A
        deps: new Set([{
          pkgId: 2, // B
          deps: new Set<HoisterPackageTree>(),
          peerDepIds: new Set([
            4, // D@X
          ]),
        }, {
          pkgId: 3, // C
          deps: new Set([{
            pkgId: 5, // D@Y
            deps: new Set<HoisterPackageTree>(),
            peerDepIds: new Set<number>(),
          }]),
          peerDepIds: new Set<number>(),
        }, {
          pkgId: 4, // D@X
          deps: new Set<HoisterPackageTree>(),
          peerDepIds: new Set<number>(),
        }]),
        peerDepIds: new Set<number>(),
      }]),
      peerDepIds: new Set<number>(),
    };

    const packages = [
      {name: '.'},
      {name: 'A'},
      {name: 'B'},
      {name: 'C'},
      {name: 'D'},
      {name: 'D'},
    ];
    const result = hoist(tree, packages);
    expect(result).toEqual({
      pkgId: 0, // .
      deps: new Set([{
        pkgId: 1, // A
        deps: new Set([{
          pkgId: 2, // B
          deps: new Set(),
        }, {
          pkgId: 4, // D@X
          deps: new Set(),
        }]),
      }, {
        pkgId: 3, // C
        deps: new Set(),
      }, {
        pkgId: 5, // D@Y
        deps: new Set(),
      }]),
    });
  });

  // it('should honor unhoisted peer dependencies', () => {
  //   // . → A ⟶ B@X
  //   //       → C@X → B@Y
  //   //   → B@X
  //   //   → C@Y
  //   // Should be hoisted to:
  //   // . → A
  //   //     → C@X → B@Y
  //   //   → B@X
  //   //   → C@Y
  //   const packages = [
  //     {name: '.', weight: 1},
  //     {name: 'A', weight: 1},
  //     {name: 'B', weight: 1},
  //     {name: 'B', weight: 1},
  //     {name: 'C', weight: 1},
  //     {name: 'C', weight: 1},
  //   ];
  //   const tree = [
  //     {deps: new Set([1, 2, 5]), peerDeps: new Set<number>()},
  //     {deps: new Set([4]), peerDeps: new Set<number>([2])},
  //     {deps: new Set<number>(), peerDeps: new Set<number>()},
  //     {deps: new Set<number>(), peerDeps: new Set<number>()},
  //     {deps: new Set<number>([3]), peerDeps: new Set<number>()},
  //     {deps: new Set<number>(), peerDeps: new Set<number>()},
  //   ];
  //   const result = hoist(tree, packages);
  //   expect(sortDeps(result)).toEqual([
  //     new Set([1, 2, 5]),
  //     new Set([4]),
  //     new Set(),
  //     new Set(),
  //     new Set([3]),
  //     new Set(),
  //   ]);
  // });

  // it('should honor peer dependency promise for the same version of dependency', () => {
  //   // . → A → B → C
  //   //   ⟶ B
  //   // Should be hoisted to (B@X must not be hoisted to the top):
  //   // . → A → B
  //   //   → C
  //   const packages = [
  //     {name: '.', weight: 1},
  //     {name: 'A', weight: 1},
  //     {name: 'B', weight: 1},
  //     {name: 'C', weight: 1},
  //   ];
  //   const tree = [
  //     {deps: new Set([1]), peerDeps: new Set<number>([2])},
  //     {deps: new Set([2]), peerDeps: new Set<number>()},
  //     {deps: new Set([3]), peerDeps: new Set<number>()},
  //     {deps: new Set<number>(), peerDeps: new Set<number>()},
  //   ];
  //   const result = hoist(tree, packages);
  //   expect(sortDeps(result)).toEqual([
  //     new Set([1, 3]),
  //     new Set([2]),
  //     new Set(),
  //     new Set(),
  //   ]);
  // });

  it('should hoist different copies of a package independently', () => {
    // . → A → B@X → C@X
    //     → C@Y
    //   → D → B@X → C@X
    //   → B@Y
    //   → C@Z
    // Should be hoisted to (top C@X instance must not be hoisted):
    // . → A → B@X → C@X
    //     → C@Y
    //   → D → B@X
    //     → C@X
    //   → B@Y
    //   → C@Z
    const packages = [
      {name: '.'}, // .   - 0
      {name: 'A'}, // A   - 1
      {name: 'B'}, // B@X - 2
      {name: 'B'}, // B@Y - 3
      {name: 'C'}, // C@X - 4
      {name: 'C'}, // C@Y - 5
      {name: 'C'}, // C@Z - 6
      {name: 'D'}, // D   - 7
    ];
    const tree = {
      pkgId: 0, // .
      deps: new Set([{
        pkgId: 1, // A
        deps: new Set([{
          pkgId: 2, // B@X
          deps: new Set([{
            pkgId: 4, // C@X
            deps: new Set<HoisterPackageTree>(),
            peerDepIds: new Set<number>(),
          }]),
          peerDepIds: new Set<number>(),
        }, {
          pkgId: 5, // C@Y
          deps: new Set<HoisterPackageTree>(),
          peerDepIds: new Set<number>(),
        }]),
        peerDepIds: new Set<number>(),
      }, {
        pkgId: 7, // D
        deps: new Set([{
          pkgId: 2, // B@X
          deps: new Set([{
            pkgId: 4, // C@X
            deps: new Set<HoisterPackageTree>(),
            peerDepIds: new Set<number>(),
          }]),
          peerDepIds: new Set<number>(),
        }]),
        peerDepIds: new Set<number>(),
      }, {
        pkgId: 3, // B@Y
        deps: new Set<HoisterPackageTree>(),
        peerDepIds: new Set<number>(),
      }, {
        pkgId: 6, // C@Z
        deps: new Set<HoisterPackageTree>(),
        peerDepIds: new Set<number>(),
      }]),
      peerDepIds: new Set<number>(),
    };
    const result = hoist(tree, packages);
    expect(result).toEqual({
      pkgId: 0, // .
      deps: new Set([{
        pkgId: 1, // A
        deps: new Set([{
          pkgId: 2, // B@X
          deps: new Set([{
            pkgId: 4, // C@X
            deps: new Set(),
          }]),
        }, {
          pkgId: 5, // C@Y
          deps: new Set(),
        }]),
      }, {
        pkgId: 7, // D
        deps: new Set([{
          pkgId: 2, // B@X
          deps: new Set(),
        }, {
          pkgId: 4, // C@X
          deps: new Set(),
        }]),
      }, {
        pkgId: 3, // B@Y
        deps: new Set(),
      }, {
        pkgId: 6, // C@Z
        deps: new Set(),
      }]),
    });
  });
});
