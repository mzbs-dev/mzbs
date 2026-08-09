from router.staff_profile import staff_profile_router


def test_staff_profile_router_registers_expected_routes():
    paths = {route.path for route in staff_profile_router.routes}

    assert "/staff-profile/list" in paths
    assert "/staff-profile/{staff_id}" in paths
    assert "/staff-profile/{staff_id}/shifts" in paths
