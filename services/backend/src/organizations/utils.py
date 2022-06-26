def get_user_org(user):
    user_orgs = user.orgs.all()
    if user_orgs.count():
        return user_orgs[0]
